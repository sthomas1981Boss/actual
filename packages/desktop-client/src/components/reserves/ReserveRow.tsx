import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { integerToCurrency } from '@actual-app/core/shared/util';

import type { ReserveBreakdownRow } from '#hooks/useReserveBreakdown';

type ReserveRowProps = {
  row: ReserveBreakdownRow;
  isUnallocated?: boolean;
};

export function ReserveRow({ row, isUnallocated = false }: ReserveRowProps) {
  // A reserve can go negative if it was drawn on more than it was funded.
  // Showing that plainly is the point — it means the provision is overdrawn —
  // but a share of the envelope is meaningless then, so bar and percentage are
  // dropped rather than showing something like "-168%".
  const isNegative = row.amount < 0;
  const percent = isNegative ? null : Math.round(row.share * 100);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: '8px 0',
        borderTop: isUnallocated ? `1px solid ${theme.tableBorder}` : undefined,
        marginTop: isUnallocated ? 8 : 0,
      }}
    >
      <Text
        style={{
          width: 200,
          fontStyle: isUnallocated ? 'italic' : undefined,
          color: isUnallocated ? theme.pageTextSubdued : theme.pageText,
        }}
      >
        {row.name}
      </Text>

      <View
        style={{
          flex: 1,
          height: 10,
          backgroundColor: theme.tableBorder,
          borderRadius: 5,
          overflow: 'hidden',
          marginRight: 15,
        }}
      >
        {percent !== null && (
          <View
            style={{
              width: `${Math.max(0, Math.min(100, percent))}%`,
              height: '100%',
              backgroundColor: isUnallocated
                ? theme.pageTextSubdued
                : theme.reportsBlue,
            }}
          />
        )}
      </View>

      <Text
        style={{
          width: 120,
          textAlign: 'right',
          ...styles.tnum,
          color: isNegative ? theme.errorText : theme.pageText,
        }}
      >
        {integerToCurrency(row.amount)}
      </Text>
      <Text
        style={{
          width: 60,
          textAlign: 'right',
          ...styles.tnum,
          color: theme.pageTextSubdued,
        }}
      >
        {percent === null ? '' : `${percent}%`}
      </Text>
    </View>
  );
}
