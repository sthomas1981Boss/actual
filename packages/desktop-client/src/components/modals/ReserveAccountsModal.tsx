import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { integerToCurrency } from '@actual-app/core/shared/util';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { Checkbox } from '#components/forms';
import { useAccounts } from '#hooks/useAccounts';
import {
  isEligibleReserveAccount,
  useReserveAccountIds,
} from '#hooks/useReserveBreakdown';

// Only off-budget accounts are eligible: an on-budget account's balance is
// already accounted for by the budget, and splitting it into reserves would
// double-count the same money.
export function ReserveAccountsModal() {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const [savedIds, setSavedIds] = useReserveAccountIds();
  const [selected, setSelected] = useState<string[]>(savedIds);

  const eligible = accounts.filter(isEligibleReserveAccount);

  const toggle = (id: string, checked: boolean) =>
    setSelected(prev =>
      checked ? [...new Set([...prev, id])] : prev.filter(x => x !== id),
    );

  return (
    <Modal name="reserve-accounts" containerProps={{ style: { width: 450 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Accounts to split into reserves')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ gap: 15 }}>
            <Text style={{ color: theme.pageTextLight, lineHeight: 1.5 }}>
              <Trans>
                The balance of the accounts you pick here is what gets split
                across reserves. Accounts left unchecked stay plain savings.
              </Trans>
            </Text>

            {eligible.length === 0 ? (
              <Text style={{ color: theme.pageTextSubdued }}>
                <Trans>
                  No off-budget account yet. Mark a savings account as
                  off-budget in its settings first.
                </Trans>
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {eligible.map(account => (
                  <View
                    key={account.id}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <Checkbox
                      id={`reserve-account-${account.id}`}
                      checked={selected.includes(account.id)}
                      onChange={e => toggle(account.id, e.target.checked)}
                    />
                    <label
                      htmlFor={`reserve-account-${account.id}`}
                      style={{ flex: 1, userSelect: 'none' }}
                    >
                      {account.name}
                    </label>
                    <Text style={{ color: theme.pageTextSubdued }}>
                      {account.balance_current != null
                        ? integerToCurrency(account.balance_current)
                        : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                onPress={() => {
                  setSavedIds(selected);
                  state.close();
                }}
              >
                <Trans>Save</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
