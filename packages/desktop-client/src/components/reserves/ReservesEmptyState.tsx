import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type ReservesEmptyStateProps = {
  hasAccounts: boolean;
  hasEligibleAccounts: boolean;
  onPickAccounts: () => void;
};

// Three distinct dead ends, each needing a different next step. Showing one
// generic "nothing here" message would leave the user guessing which.
export function ReservesEmptyState({
  hasAccounts,
  hasEligibleAccounts,
  onPickAccounts,
}: ReservesEmptyStateProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        padding: 40,
        color: theme.pageTextSubdued,
      }}
    >
      {!hasEligibleAccounts ? (
        <Text>
          <Trans>
            Reserves split the balance of an off-budget savings account. Mark a
            savings account as off-budget in its settings to get started.
          </Trans>
        </Text>
      ) : !hasAccounts ? (
        <>
          <Text style={{ marginBottom: 15 }}>
            <Trans>
              Choose which savings accounts should be split into reserves.
            </Trans>
          </Text>
          <Button variant="primary" onPress={onPickAccounts}>
            <Trans>Accounts to split…</Trans>
          </Button>
        </>
      ) : (
        <Text>
          <Trans>
            No reserve yet. Create one, then assign transfers to it from the
            account&apos;s transaction list.
          </Trans>
        </Text>
      )}
    </View>
  );
}
