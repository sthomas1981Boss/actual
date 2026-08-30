import { useMemo } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { useQuery as useReactQuery } from '@tanstack/react-query';

import { useQuery } from '#hooks/useQuery';
import { useReserveAccountIds } from '#hooks/useReserveBreakdown';
import { reserveQueries } from '#reserves/queries';

export type ReserveHistoryRow = {
  id: string | null; // null = the unallocated remainder
  name: string;
  /** Net movement within each month, indexed like `months`. */
  changes: number[];
  /** Running balance at each month end, indexed like `months`. */
  balances: number[];
};

export type ReserveHistory = {
  months: string[]; // 'YYYY-MM'
  rows: ReserveHistoryRow[];
  isLoading: boolean;
};

/**
 * Monthly history of every reserve for one year.
 *
 * A single grouped query rather than twelve dated ones: the hook rules forbid
 * calling a hook per month, and one query is far cheaper anyway. Running
 * balances are accumulated here, and they include everything before the year
 * shown — a reserve funded in 2025 must not appear empty in January 2026.
 */
export function useReserveHistory(year: number): ReserveHistory {
  const [accountIds] = useReserveAccountIds();
  const { data: reserves = [] } = useReactQuery(reserveQueries.list());

  const { data: rowsByMonth, isLoading } = useQuery<{
    month: string;
    reserve: string | null;
    amount: number;
  }>(
    () =>
      accountIds.length === 0
        ? null
        : q('transactions')
            .filter({ account: { $oneof: accountIds } })
            .groupBy([{ $month: '$date' }, { $id: '$reserve' }])
            .select([
              { month: { $month: '$date' } },
              { reserve: { $id: '$reserve.id' } },
              { amount: { $sum: '$amount' } },
            ]),
    [accountIds],
  );

  return useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) =>
      monthUtils.addMonths(`${year}-01`, i),
    );

    // reserve id (or null) -> month -> net movement
    const parReserve = new Map<string | null, Map<string, number>>();
    for (const row of rowsByMonth ?? []) {
      if (!row.month) continue;
      const key = row.reserve ?? null;
      if (!parReserve.has(key)) parReserve.set(key, new Map());
      parReserve.get(key)!.set(row.month, row.amount ?? 0);
    }

    const build = (id: string | null, name: string): ReserveHistoryRow => {
      const mouvements = parReserve.get(id) ?? new Map<string, number>();

      // Opening balance: everything strictly before the displayed year.
      let cumul = 0;
      for (const [month, amount] of mouvements) {
        if (month < months[0]) cumul += amount;
      }

      const changes: number[] = [];
      const balances: number[] = [];
      for (const month of months) {
        const variation = mouvements.get(month) ?? 0;
        cumul += variation;
        changes.push(variation);
        balances.push(cumul);
      }
      return { id, name, changes, balances };
    };

    const rows = reserves.map(reserve => build(reserve.id, reserve.name));
    rows.push(build(null, 'unallocated'));

    return { months, rows, isLoading };
  }, [rowsByMonth, reserves, year, isLoading]);
}
