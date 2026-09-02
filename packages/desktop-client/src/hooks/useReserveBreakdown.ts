import { useMemo } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import type {
  AccountEntity,
  SavingsReserveEntity,
  SavingsReserveEntryEntity,
} from '@actual-app/core/types/models';

import { useSyncedPref } from '#hooks/useSyncedPref';

/** Ids of the off-budget accounts the user opted into reserve tracking. */
export function useReserveAccountIds(): [string[], (ids: string[]) => void] {
  const [raw, setRaw] = useSyncedPref('savings-reserve-accounts');
  const ids = useMemo(() => {
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter(v => typeof v === 'string')
        : [];
    } catch {
      return [];
    }
  }, [raw]);

  return [ids, (next: string[]) => setRaw(JSON.stringify(next))];
}

/**
 * The month a reserve came to life: the earliest one carrying a typed figure.
 * Nothing accrues before it — a standing order with no origin would backfill
 * the whole history and invent a past that never happened.
 */
export function firstFundedMonth(
  reserveId: string,
  entries: SavingsReserveEntryEntity[],
): string | null {
  let earliest: string | null = null;
  for (const entry of entries) {
    if (entry.reserve_id !== reserveId) continue;
    if (earliest === null || entry.month < earliest) earliest = entry.month;
  }
  return earliest;
}

/**
 * What a reserve receives, or gives up, during `month`.
 *
 * A month carries either what was typed into it, or the standing order — never
 * both. Typing into a month replaces that month's payment, which is what makes
 * the table predictable: the figure entered is the money moved, and nothing
 * else is quietly recorded alongside it.
 *
 * Nothing happens before the first month typed into: a standing order with no
 * origin would run back through the whole history and invent a past.
 */
export function reservePaymentIn(
  reserve: Pick<SavingsReserveEntity, 'id' | 'monthly_amount'>,
  entries: SavingsReserveEntryEntity[],
  month: string,
): number {
  const start = firstFundedMonth(reserve.id, entries);
  if (start === null || month < start) return 0;

  const typed = entries.find(
    e => e.reserve_id === reserve.id && e.month === month,
  );
  return typed ? typed.amount : reserve.monthly_amount;
}

/**
 * What a reserve holds at the end of `month`: every monthly payment added up
 * since it started.
 *
 * Nothing is stored: re-typing a figure on a past month corrects the running
 * total from that month onwards, which is what you want from a balance.
 */
export function reserveBalanceAt(
  reserve: Pick<SavingsReserveEntity, 'id' | 'monthly_amount'>,
  entries: SavingsReserveEntryEntity[],
  month: string,
): number {
  const start = firstFundedMonth(reserve.id, entries);
  if (start === null || month < start) return 0;

  let total = 0;
  for (let m = start; m <= month; m = monthUtils.addMonths(m, 1)) {
    total += reservePaymentIn(reserve, entries, m);
  }
  return total;
}

/** Accounts eligible to be opted in: off-budget and open. */
export function isEligibleReserveAccount(account: AccountEntity): boolean {
  return !!account.offbudget && !account.closed;
}
