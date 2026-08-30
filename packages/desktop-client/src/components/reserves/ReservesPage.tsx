import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { integerToCurrency } from '@actual-app/core/shared/util';

import { Page } from '#components/Page';
import { useAccounts } from '#hooks/useAccounts';
import {
  isEligibleReserveAccount,
  useReserveAccountIds,
  useReserveBreakdown,
} from '#hooks/useReserveBreakdown';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { ReserveHistory } from './ReserveHistory';
import { ReserveRow } from './ReserveRow';
import { ReservesEmptyState } from './ReservesEmptyState';

// The reserves screen answers a different question from the budget: not "did I
// hold my spending this month?" but "how much have I set aside, and for what?".
// It deliberately shares no state with the budget screen.

export function ReservesPage() {
  const { t } = useTranslation();
  const [accountIds] = useReserveAccountIds();
  const { data: accounts = [] } = useAccounts();
  const { envelope, rows, orphanedAmount, isLoading } = useReserveBreakdown();
  const dispatch = useDispatch();
  const pickAccounts = () =>
    dispatch(pushModal({ modal: { name: 'reserve-accounts', options: {} } }));

  const trackedAccounts = accounts.filter(a => accountIds.includes(a.id));
  const eligible = accounts.filter(isEligibleReserveAccount);

  const reserveRows = rows.filter(r => r.id !== null);
  const unallocated = rows.find(r => r.id === null);

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
            {integerToCurrency(envelope)}
          </Text>
          <Text style={{ color: theme.pageTextSubdued }}>
            {trackedAccounts.length === 0 ? (
              <Trans>No account is being split into reserves yet</Trans>
            ) : (
              trackedAccounts.map(a => a.name).join(' · ')
            )}
          </Text>
        </View>

        <Button onPress={pickAccounts}>
          <Trans>Accounts to split…</Trans>
        </Button>
      </View>

      {accountIds.length === 0 || (reserveRows.length === 0 && !isLoading) ? (
        <ReservesEmptyState
          hasAccounts={accountIds.length > 0}
          hasEligibleAccounts={eligible.length > 0}
          onPickAccounts={pickAccounts}
        />
      ) : (
        <View>
          {reserveRows.map(row => (
            <ReserveRow key={row.id} row={row} />
          ))}

          {unallocated && (
            <ReserveRow
              row={{ ...unallocated, name: t('Unallocated') }}
              isUnallocated
            />
          )}
        </View>
      )}

      {accountIds.length > 0 && reserveRows.length > 0 && <ReserveHistory />}

      {orphanedAmount !== 0 && (
        <Text
          style={{
            marginTop: 15,
            color: theme.warningText,
            ...styles.smallText,
          }}
        >
          <Trans>
            {{ amount: integerToCurrency(orphanedAmount) }} is assigned to
            reserves on accounts that are no longer being split. Add those
            accounts back, or clear the assignments.
          </Trans>
        </Text>
      )}
    </Page>
  );
}
