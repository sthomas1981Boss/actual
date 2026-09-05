import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgArrowThinLeft,
  SvgArrowThinRight,
} from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { integerToCurrency } from '@actual-app/core/shared/util';
import { useQuery as useReactQuery } from '@tanstack/react-query';

import { Page } from '#components/Page';
import { useAccounts } from '#hooks/useAccounts';
import {
  isEligibleReserveAccount,
  useReserveAccountIds,
} from '#hooks/useReserveBreakdown';
import { useReserveHistory } from '#hooks/useReserveHistory';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import {
  useCreateReserveMutation,
  useDeleteReserveMutation,
  useMoveReserveMutation,
  useSetReserveEntryMutation,
  useSetReserveMonthlyMutation,
  useUpdateReserveMutation,
} from '#reserves/mutations';
import { reserveQueries } from '#reserves/queries';

import { ReserveGrid } from './ReserveGrid';
import { ReservesEmptyState } from './ReservesEmptyState';

// The reserves screen answers a different question from the budget: not "did I
// hold my spending this month?" but "how much have I set aside, and for what?".
// It deliberately shares no state with the budget screen, and nothing on a
// transaction feeds it — a reserve is driven from this table alone.

export function ReservesPage() {
  const { t } = useTranslation();
  const [accountIds] = useReserveAccountIds();
  const { data: accounts = [] } = useAccounts();
  const [year, setYear] = useState(() =>
    Number(monthUtils.currentMonth().slice(0, 4)),
  );
  const history = useReserveHistory(year);
  const { data: reserves = [] } = useReactQuery(reserveQueries.list());

  const dispatch = useDispatch();
  const { mutate: createReserve } = useCreateReserveMutation();
  const { mutate: updateReserve } = useUpdateReserveMutation();
  const { mutate: deleteReserve } = useDeleteReserveMutation();
  const { mutate: setEntry } = useSetReserveEntryMutation();
  const { mutate: moveReserve } = useMoveReserveMutation();
  const { mutate: setMonthlyAmount } = useSetReserveMonthlyMutation();

  const trackedAccounts = accounts.filter(a => accountIds.includes(a.id));
  const eligible = accounts.filter(isEligibleReserveAccount);

  // The envelope as it stands today: the last non-projected column.
  const envelopeNow =
    (history.unallocated[history.firstProjectedIndex - 1] ?? 0) +
    history.rows.reduce(
      (total, row) =>
        total + (row.balances[history.firstProjectedIndex - 1] ?? 0),
      0,
    );

  const pickAccounts = () =>
    dispatch(pushModal({ modal: { name: 'reserve-accounts', options: {} } }));

  // A name has to be non-empty and unique: two reserves called "Maison" would
  // be indistinguishable everywhere they appear.
  const validateName = (value: string, exceptId?: string) => {
    const name = value.trim();
    if (!name) return t('A name is required');
    const clash = reserves.some(r => r.id !== exceptId && r.name === name);
    return clash ? t('A reserve with this name already exists') : null;
  };

  const askForName = (options: {
    title: string;
    buttonText: string;
    defaultValue?: string;
    exceptId?: string;
    onSubmit: (name: string) => void;
  }) =>
    dispatch(
      pushModal({
        modal: {
          name: 'reserve-name',
          options: {
            title: options.title,
            buttonText: options.buttonText,
            placeholder: t('Reserve name'),
            defaultValue: options.defaultValue,
            onValidate: (value: string) =>
              validateName(value, options.exceptId),
            onSubmit: (value: string) => options.onSubmit(value.trim()),
          },
        },
      }),
    );

  const addReserve = () =>
    askForName({
      title: t('New reserve'),
      buttonText: t('Add'),
      onSubmit: name => createReserve({ name }),
    });

  const renameReserve = (id: string, current: string) =>
    askForName({
      title: t('Rename reserve'),
      buttonText: t('Rename'),
      defaultValue: current,
      exceptId: id,
      onSubmit: name => updateReserve({ id, name }),
    });

  // Deleting only drops the reserve: what it held goes back to unallocated.
  const removeReserve = (id: string, name: string, amount: number) =>
    dispatch(
      pushModal({
        modal: {
          name: 'confirm-delete',
          options: {
            message: t(
              'Delete the reserve "{{name}}"? The {{amount}} it holds goes back to unallocated.',
              { name, amount: integerToCurrency(amount) },
            ),
            onConfirm: () => deleteReserve({ id }),
          },
        },
      }),
    );

  // The standing order alone does nothing: it only starts adding up from the
  // month after the first figure typed into the table. Changing it leaves the
  // months already gone as they were — a balance you have read stays put.
  const setMonthly = (id: string, amount: number) =>
    setMonthlyAmount({
      id,
      amount,
      from_month: monthUtils.currentMonth(),
    });

  // Typing in a cell records what goes into the reserve that month — nothing
  // more. It replaces that month's standing order, so what is entered is
  // exactly what is stored, and the running total follows from there.
  const setPayment = (id: string, month: string, amount: number) =>
    setEntry({ reserve_id: id, month, amount });

  const hasReserves = history.rows.length > 0;

  return (
    <Page header={t('Reserves')}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 15,
        }}
      >
        <View>
          <Text style={{ ...styles.mediumText, fontWeight: 500 }}>
            {integerToCurrency(envelopeNow)}
          </Text>
          <Text style={{ color: theme.pageTextSubdued }}>
            {trackedAccounts.length === 0 ? (
              <Trans>No account is being split into reserves yet</Trans>
            ) : (
              trackedAccounts.map(a => a.name).join(' · ')
            )}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Button variant="bare" onPress={() => setYear(y => y - 1)}>
              <SvgArrowThinLeft width={10} height={10} />
            </Button>
            <Text style={{ ...styles.tnum, minWidth: 40, textAlign: 'center' }}>
              {year}
            </Text>
            <Button variant="bare" onPress={() => setYear(y => y + 1)}>
              <SvgArrowThinRight width={10} height={10} />
            </Button>
          </View>

          <Button onPress={pickAccounts}>
            <Trans>Accounts to split…</Trans>
          </Button>
          <Button
            variant="primary"
            isDisabled={accountIds.length === 0}
            onPress={addReserve}
          >
            <Trans>New reserve</Trans>
          </Button>
        </View>
      </View>

      {accountIds.length === 0 || (!hasReserves && !history.isLoading) ? (
        <ReservesEmptyState
          hasAccounts={accountIds.length > 0}
          hasEligibleAccounts={eligible.length > 0}
          onPickAccounts={pickAccounts}
        />
      ) : (
        <ReserveGrid
          months={history.months}
          rows={history.rows}
          envelopes={history.envelopes}
          unallocated={history.unallocated}
          firstProjectedIndex={history.firstProjectedIndex}
          isLoading={history.isLoading}
          onSetMonthly={setMonthly}
          onSetPayment={setPayment}
          onRename={renameReserve}
          onDelete={removeReserve}
          onMove={(id, direction) => moveReserve({ id, direction })}
        />
      )}

      {hasReserves && (
        <Text
          style={{
            marginTop: 12,
            color: theme.pageTextSubdued,
            ...styles.smallText,
          }}
        >
          <Trans>
            Figures past the current month are a projection: today's balance
            plus what each standing order will add.
          </Trans>
        </Text>
      )}
    </Page>
  );
}
