import { createApp } from '#server/app';
import * as db from '#server/db';
import { mutator } from '#server/mutators';
import { undoable } from '#server/undo';
import type {
  SavingsReserveEntity,
  SavingsReserveEntryEntity,
} from '#types/models';

// Reserves are named provisions carved out of the off-budget savings accounts
// listed in the `savings-reserve-accounts` synced pref. They deliberately live
// outside the budget: the budget answers "did I hold my monthly spending?",
// a reserve answers "how much have I set aside for the car?".
//
// A reserve is fed from two places, and only two:
//   - entries, the one-off amounts typed straight into the table; the first
//     one is what starts the running total
//   - `monthly_amount`, the same sum added every month after that first entry
// Nothing on a transaction feeds a reserve: two sources for one balance made
// any discrepancy impossible to trace back.

export type ReservesHandlers = {
  'reserve-monthly-set': typeof setMonthlyAmount;
  'reserves-get': typeof getReserves;
  'reserves-create': typeof createReserve;
  'reserves-update': typeof updateReserve;
  'reserves-delete': typeof deleteReserve;
  'reserve-entries-get': typeof getEntries;
  'reserve-entry-set': typeof setEntry;
};

export const app = createApp<ReservesHandlers>();
app.method('reserves-get', getReserves);
app.method('reserves-create', mutator(undoable(createReserve)));
app.method('reserves-update', mutator(undoable(updateReserve)));
app.method('reserves-delete', mutator(undoable(deleteReserve)));
app.method('reserve-entries-get', getEntries);
app.method('reserve-entry-set', mutator(undoable(setEntry)));
app.method('reserve-monthly-set', mutator(undoable(setMonthlyAmount)));

async function getReserves(): Promise<SavingsReserveEntity[]> {
  const reserves = await db.getSavingsReserves();
  return reserves.map(reserve => ({
    id: reserve.id,
    name: reserve.name,
    sort_order: reserve.sort_order,
    monthly_amount: reserve.monthly_amount ?? 0,
  }));
}

async function createReserve({
  name,
  monthly_amount = 0,
}: Pick<SavingsReserveEntity, 'name'> &
  Partial<Pick<SavingsReserveEntity, 'monthly_amount'>>): Promise<
  SavingsReserveEntity['id']
> {
  const existing = await db.getSavingsReserves();
  // New reserves go last; `sort_order` is a float so a reorder can slot a
  // reserve between two others without renumbering the whole list.
  const sort_order = existing.length
    ? Math.max(...existing.map(r => r.sort_order ?? 0)) + 1
    : 1;

  return db.insertSavingsReserve({ name, sort_order, monthly_amount });
}

async function updateReserve(
  reserve: Partial<SavingsReserveEntity> & Pick<SavingsReserveEntity, 'id'>,
): Promise<void> {
  await db.updateSavingsReserve(reserve);
}

async function deleteReserve({
  id,
}: Pick<SavingsReserveEntity, 'id'>): Promise<void> {
  await db.deleteSavingsReserve(id);
}

async function getEntries(): Promise<SavingsReserveEntryEntity[]> {
  const entries = await db.getSavingsReserveEntries();
  return entries.map(entry => ({
    id: entry.id,
    reserve_id: entry.reserve_id,
    month: entry.month,
    amount: entry.amount,
  }));
}

async function setEntry({
  reserve_id,
  month,
  amount,
}: Omit<SavingsReserveEntryEntity, 'id'>): Promise<void> {
  await db.setSavingsReserveEntry({ reserve_id, month, amount });
}

/**
 * Changes what a reserve puts aside every month, without rewriting its past.
 *
 * The months already gone keep the old amount — written down as if they had
 * been typed — so a balance you have already read stays what it was. Only the
 * months from `from_month` on follow the new figure.
 */
async function setMonthlyAmount({
  id,
  amount,
  from_month,
}: {
  id: SavingsReserveEntity['id'];
  amount: number;
  /** First month the new amount applies to, 'YYYY-MM'. */
  from_month: string;
}): Promise<void> {
  const reserves = await db.getSavingsReserves();
  const reserve = reserves.find(r => r.id === id);
  if (!reserve) return;

  const previous = reserve.monthly_amount ?? 0;
  if (previous !== amount && previous !== 0) {
    const entries = await db.getSavingsReserveEntries();
    const mine = entries.filter(e => e.reserve_id === id);
    // Nothing accrued before the first figure typed, so there is nothing to
    // freeze before it either.
    const start = mine.reduce<string | null>(
      (earliest, e) =>
        earliest === null || e.month < earliest ? e.month : earliest,
      null,
    );

    for (const month of monthsToFreeze(
      start,
      from_month,
      mine.map(e => e.month),
    )) {
      await db.setSavingsReserveEntry({
        reserve_id: id,
        month,
        amount: previous,
      });
    }
  }

  await db.updateSavingsReserve({ id, monthly_amount: amount });
}

/**
 * The months to write down when the standing order changes: everything between
 * the reserve's first figure and `fromMonth`, minus the months already carrying
 * a typed figure. The first month is left out — it holds the opening figure,
 * not a standing-order payment.
 */
export function monthsToFreeze(
  start: string | null,
  fromMonth: string,
  alreadyTyped: Iterable<string>,
): string[] {
  if (start === null) return [];
  const typed = new Set(alreadyTyped);
  const months: string[] = [];
  for (let m = nextMonth(start); m < fromMonth; m = nextMonth(m)) {
    if (!typed.has(m)) months.push(m);
  }
  return months;
}

/** 'YYYY-MM' + 1, without pulling a date library into the server. */
function nextMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return m === 12
    ? `${year + 1}-01`
    : `${year}-${String(m + 1).padStart(2, '0')}`;
}
