import { send } from '@actual-app/core/platform/client/connection';
import type { SavingsReserveEntity } from '@actual-app/core/types/models';
import { queryOptions } from '@tanstack/react-query';

export const reserveQueries = {
  all: () => ['reserves'],
  lists: () => [...reserveQueries.all(), 'lists'],
  list: () =>
    queryOptions<SavingsReserveEntity[]>({
      queryKey: [...reserveQueries.lists()],
      queryFn: () => send('reserves-get'),
      placeholderData: [],
      // Manually invalidated when reserves change
      staleTime: Infinity,
    }),
};
