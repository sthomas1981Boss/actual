import { useMemo } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import { useQuery as useReactQuery } from '@tanstack/react-query';

import { useQuery } from '#hooks/useQuery';
import {
  reserveBalanceAt,
  reservePaymentIn,
  useReserveAccountIds,
} from '#hooks/useReserveBreakdown';
import { reserveQueries } from '#reserves/queries';

export type ReserveHistoryRow = {
  id: string;
  name: string;
  /** The standing order: the same sum set aside every month. */
  monthlyAmount: number;
  /** Balance at the end of each month of the year. */
  balances: number[];
  /** Months carrying a figure typed by hand, rather than the standing order. */
  typedMonths: string[];
  /** What goes into the reserve each month, typed or from the standing order. */
  payments: number[];
};

/**
 * The money available to split, month by month.
 *
 * Up to the current month it is what the accounts actually held. Beyond it,
 * what a standing order sets aside is money moved *onto* the account, so the
 * envelope grows by exactly what the reserves gain — which keeps the leftover
 * line steady instead of draining it into negative figures.
 */
export function envelopesOverMonths({
  months,
  balancesByMonth,
  firstProjectedIndex,
  balanceAt,
  balanceNow,
  setAsideNow,
}: {
  months: string[];
  /** Total set aside across every reserve, for each displayed month. */
  balancesByMonth: number[];
  firstProjectedIndex: number;
  /** What the accounts held at the end of a past month. */
  balanceAt: (month: string) => number;
  /** What the accounts hold today. */
  balanceNow: number;
  /** Total set aside across every reserve as of today. */
  setAsideNow: number;
}): number[] {
  return months.map((month, i) =>
    i < firstProjectedIndex
      ? balanceAt(month)
      : balanceNow + (balancesByMonth[i] - setAsideNow),
  );
}

export type ReserveHistory = {
  months: string[];
  rows: ReserveHistoryRow[];
  /** What the split accounts hold at the end of each month. */
  envelopes: number[];
  /** What is left on the accounts once every reserve is served, per month. */
  unallocated: number[];
  /**
   * Index of the first projected month. Up to it the balances are what the
   * accounts really held; past it they assume the standing orders keep running
   * and the accounts do not move.
   */
  firstProjectedIndex: number;
  isLoading: boolean;
};

/**
 * Month-by-month reading of every reserve over one year.
 *
 * Everything is derived from the reserves and their entries, so re-typing an
 * amount for a past month corrects the history from that month onwards — which
 * is what you want from a balance.
 */
export function useReserveHistory(year: number): ReserveHistory {
  const { data: reserves = [], isLoading: loadingReserves } = useReactQuery(
    reserveQueries.list(),
  );
  const { data: entries = [], isLoading: loadingEntries } = useReactQuery(
    reserveQueries.entryList(),
  );
  const [accountIds] = useReserveAccountIds();

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        monthUtils.addMonths(`${year}-01`, i),
      ),
    [year],
  );

  // What the accounts held at the end of each month. Without it the leftover
  // line could only be computed for the current month, and every earlier
  // column would silently use today's balance.
  const { data: monthlyTotals } = useQuery<{ month: string; amount: number }>(
    () =>
      accountIds.length === 0
        ? null
        : q('transactions')
            .filter({ account: { $oneof: accountIds } })
            .groupBy([{ $month: '$date' }])
            .select([
              { month: { $month: '$date' } },
              { amount: { $sum: '$amount' } },
            ]),
    [accountIds],
  );

  return useMemo(() => {
    const thisMonth = monthUtils.currentMonth();

    const rows = reserves.map(reserve => ({
      id: reserve.id,
      name: reserve.name,
      monthlyAmount: reserve.monthly_amount,
      balances: months.map(month => reserveBalanceAt(reserve, entries, month)),
      typedMonths: entries
        .filter(e => e.reserve_id === reserve.id)
        .map(e => e.month),
      payments: months.map(month => reservePaymentIn(reserve, entries, month)),
    }));

    // Account balance at each month end: every transaction up to and including
    // it.
    const perMonth = new Map(
      (monthlyTotals ?? []).map(r => [r.month, r.amount ?? 0]),
    );
    const balanceAt = (month: string) =>
      [...perMonth.entries()].reduce(
        (total, [m, amount]) => (m <= month ? total + amount : total),
        0,
      );

    // Everything after the current month is a projection. When the displayed
    // year is entirely past, nothing is projected; when it is entirely ahead,
    // everything is.
    const firstProjectedIndex = months.findIndex(m => m > thisMonth);

    // Past and present read the accounts. Beyond that, the money a standing
    // order sets aside is money transferred *onto* the account, so the envelope
    // grows with it — leaving the envelope flat would drain the leftover line
    // month after month and end up showing a negative balance that nothing
    // justifies.
    //
    // Measured against the reserves' own balances rather than the months on
    // screen, so a year displayed entirely in the future still counts the
    // months between today and it.
    const setAsideNow = reserves.reduce(
      (total, reserve) => total + reserveBalanceAt(reserve, entries, thisMonth),
      0,
    );
    const envelopes = months.map((month, i) => {
      if (i < firstProjectedIndex) return balanceAt(month);
      const setAsideThen = rows.reduce((t, r) => t + r.balances[i], 0);
      return balanceAt(thisMonth) + (setAsideThen - setAsideNow);
    });

    const unallocated = envelopes.map(
      (envelope, i) => envelope - rows.reduce((t, r) => t + r.balances[i], 0),
    );

    return {
      months,
      rows,
      envelopes,
      unallocated,
      firstProjectedIndex:
        firstProjectedIndex === -1 ? months.length : firstProjectedIndex,
      isLoading: loadingReserves || loadingEntries,
    };
  }, [
    reserves,
    entries,
    months,
    monthlyTotals,
    loadingReserves,
    loadingEntries,
  ]);
}
