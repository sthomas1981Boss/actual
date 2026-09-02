import { send } from '@actual-app/core/platform/client/connection';
import type { SavingsReserveEntity } from '@actual-app/core/types/models';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reserveQueries } from './queries';

// Both caches: an amount typed for one month changes the running balances of
// every later month, and deleting a reserve drops its entries with it.
function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: reserveQueries.lists() });
    void queryClient.invalidateQueries({ queryKey: reserveQueries.entries() });
  };
}

export function useCreateReserveMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ name }: Pick<SavingsReserveEntity, 'name'>) =>
      send('reserves-create', { name }),
    onSuccess: invalidate,
  });
}

/**
 * Changes the standing order without rewriting the past: the months already
 * gone keep the old amount, the new one applies from `from_month`.
 */
export function useSetReserveMonthlyMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (params: { id: string; amount: number; from_month: string }) =>
      send('reserve-monthly-set', params),
    onSuccess: invalidate,
  });
}

/** Sets what a reserve gets, or gives up, in one month. */
export function useSetReserveEntryMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (entry: {
      reserve_id: string;
      month: string;
      amount: number;
    }) => send('reserve-entry-set', entry),
    onSuccess: invalidate,
  });
}

export function useUpdateReserveMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (
      reserve: Partial<SavingsReserveEntity> & Pick<SavingsReserveEntity, 'id'>,
    ) => send('reserves-update', reserve),
    onSuccess: invalidate,
  });
}

export function useDeleteReserveMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id }: Pick<SavingsReserveEntity, 'id'>) =>
      send('reserves-delete', { id }),
    onSuccess: invalidate,
  });
}
