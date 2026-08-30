import { send } from '@actual-app/core/platform/client/connection';
import type { SavingsReserveEntity } from '@actual-app/core/types/models';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reserveQueries } from './queries';

// Reserve edits also change what the transaction list shows, so both caches
// are invalidated: a renamed or deleted reserve must not linger in the
// Reserve column of an already-rendered row.
function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: reserveQueries.lists() });
    void queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

export function useUpdateReserveMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (
      reserve: Partial<SavingsReserveEntity> &
        Pick<SavingsReserveEntity, 'id'>,
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
