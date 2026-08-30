import { useMemo } from 'react';

import { q } from '@actual-app/core/shared/query';
import type { AccountEntity } from '@actual-app/core/types/models';
import { useQuery as useReactQuery } from '@tanstack/react-query';

import { useQuery } from '#hooks/useQuery';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { reserveQueries } from '#reserves/queries';

export type ReserveBreakdownRow = {
  id: string | null; // null = the unallocated remainder
  name: string;
  amount: number;
  share: number; // 0..1 of the total envelope
};

export type ReserveBreakdown = {
  /** Sum of the balances of the accounts opted into reserve tracking. */
  envelope: number;
  rows: ReserveBreakdownRow[];
  /** Assignments whose account is no longer opted in — surfaced, not hidden. */
  orphanedAmount: number;
  isLoading: boolean;
};

/** Ids of the off-budget accounts the user opted into reserve tracking. */
export function useReserveAccountIds(): [string[], (ids: string[]) => void] {
  const [raw, setRaw] = useSyncedPref('savings-reserve-accounts');
  const ids = useMemo(() => {
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [];
    } catch {
      return [];
    }
  }, [raw]);

  return [ids, (next: string[]) => setRaw(JSON.stringify(next))];
}

/**
 * Breakdown of the reserve accounts' balance across reserves.
 *
 * `asOf` bounds the computation to a date (inclusive), which is what makes the
 * monthly history possible: the same calculation, called once per month end.
 * Passing nothing means "as of today".
 */
export function useReserveBreakdown(asOf?: string): ReserveBreakdown {
  const [accountIds] = useReserveAccountIds();
  const { data: reserves = [] } = useReactQuery(reserveQueries.list());

  const { data: byReserve, isLoading: loadingSums } = useQuery<{
    reserve: string | null;
    amount: number;
  }>(
    () =>
      accountIds.length === 0
        ? null
        : q('transactions')
            .filter({
              account: { $oneof: accountIds },
              ...(asOf ? { date: { $lte: asOf } } : {}),
            })
            .groupBy([{ $id: '$reserve' }])
            .select([
              { reserve: { $id: '$reserve.id' } },
              { amount: { $sum: '$amount' } },
            ]),
    [accountIds.join(','), asOf],
  );

  // Assignments made while an account was opted in, kept after it was removed.
  // A `calculate` query yields its scalar wrapped in the result array, hence
  // the unwrapping below rather than a plain cast.
  const { data: orphaned } = useQuery<number>(
    () =>
      q('transactions')
        .filter({
          reserve: { $ne: null },
          ...(accountIds.length ? { account: { $notoneof: accountIds } } : {}),
          ...(asOf ? { date: { $lte: asOf } } : {}),
        })
        .calculate({ $sum: '$amount' }),
    [accountIds.join(','), asOf],
  );

  return useMemo(() => {
    const sums = new Map<string | null, number>();
    for (const row of byReserve ?? []) {
      sums.set(row.reserve, row.amount ?? 0);
    }

    const envelope = [...sums.values()].reduce((total, v) => total + v, 0);
    const share = (amount: number) => (envelope === 0 ? 0 : amount / envelope);

    const rows: ReserveBreakdownRow[] = reserves.map(reserve => ({
      id: reserve.id,
      name: reserve.name,
      amount: sums.get(reserve.id) ?? 0,
      share: share(sums.get(reserve.id) ?? 0),
    }));

    // Everything not tied to a reserve, including transactions predating the
    // feature. Deliberately a row of its own: it is available savings, not an
    // error to be hidden away.
    const unallocated = sums.get(null) ?? 0;
    rows.push({
      id: null,
      name: 'unallocated',
      amount: unallocated,
      share: share(unallocated),
    });

    return {
      envelope,
      rows,
      orphanedAmount: Array.isArray(orphaned) ? (orphaned[0] ?? 0) : 0,
      isLoading: loadingSums,
    };
  }, [byReserve, orphaned, reserves, loadingSums]);
}

/** Accounts eligible to be opted in: off-budget and open. */
export function isEligibleReserveAccount(account: AccountEntity): boolean {
  return !!account.offbudget && !account.closed;
}
