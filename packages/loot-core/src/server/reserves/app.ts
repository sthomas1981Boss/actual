import { createApp } from '#server/app';
import * as db from '#server/db';
import { mutator } from '#server/mutators';
import { undoable } from '#server/undo';
import type { SavingsReserveEntity } from '#types/models';

// Reserves are named provisions carved out of the off-budget savings accounts
// listed in the `savings-reserve-accounts` synced pref. They deliberately live
// outside the budget: the budget answers "did I hold my monthly spending?",
// a reserve answers "how much have I set aside for the car?".

export type ReservesHandlers = {
  'reserves-get': typeof getReserves;
  'reserves-create': typeof createReserve;
  'reserves-update': typeof updateReserve;
  'reserves-delete': typeof deleteReserve;
};

export const app = createApp<ReservesHandlers>();
app.method('reserves-get', getReserves);
app.method('reserves-create', mutator(undoable(createReserve)));
app.method('reserves-update', mutator(undoable(updateReserve)));
app.method('reserves-delete', mutator(undoable(deleteReserve)));

async function getReserves(): Promise<SavingsReserveEntity[]> {
  const reserves = await db.getSavingsReserves();
  return reserves.map(reserve => ({
    id: reserve.id,
    name: reserve.name,
    sort_order: reserve.sort_order,
  }));
}

async function createReserve({
  name,
}: Pick<SavingsReserveEntity, 'name'>): Promise<SavingsReserveEntity['id']> {
  const existing = await db.getSavingsReserves();
  // New reserves go last; `sort_order` is a float so a reorder can slot a
  // reserve between two others without renumbering the whole list.
  const sort_order = existing.length
    ? Math.max(...existing.map(r => r.sort_order ?? 0)) + 1
    : 1;

  return db.insertSavingsReserve({ name, sort_order });
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
