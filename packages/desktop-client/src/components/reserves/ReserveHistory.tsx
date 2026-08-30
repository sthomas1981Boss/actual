import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowThinLeft, SvgArrowThinRight } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { integerToCurrency } from '@actual-app/core/shared/util';

import { useReserveHistory } from '#hooks/useReserveHistory';

// Two readings of the same data, because they answer different questions:
// the running balance says how much is set aside, the monthly change says what
// went in or out. On a provision emptied by one repair, the change tells the
// story the balance hides.
type Reading = 'balance' | 'change';

export function ReserveHistory() {
  const { t } = useTranslation();
  const [year, setYear] = useState(() =>
    Number(monthUtils.currentMonth().slice(0, 4)),
  );
  const [reading, setReading] = useState<Reading>('balance');
  const { months, rows, isLoading } = useReserveHistory(year);

  const thisMonth = monthUtils.currentMonth();

  return (
    <View style={{ marginTop: 25 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <Text style={{ ...styles.mediumText, fontWeight: 500 }}>
          <Trans>History</Trans>
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Button
              variant={reading === 'balance' ? 'primary' : 'bare'}
              onPress={() => setReading('balance')}
            >
              <Trans>Running balance</Trans>
            </Button>
            <Button
              variant={reading === 'change' ? 'primary' : 'bare'}
              onPress={() => setReading('change')}
            >
              <Trans>Monthly change</Trans>
            </Button>
          </View>

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
        </View>
      </View>

      <View style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            ...styles.smallText,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '6px 8px',
                  color: theme.tableHeaderText,
                  fontWeight: 400,
                }}
              >
                <Trans>Reserve</Trans>
              </th>
              {months.map(month => (
                <th
                  key={month}
                  style={{
                    textAlign: 'right',
                    padding: '6px 8px',
                    color: theme.tableHeaderText,
                    fontWeight: month === thisMonth ? 600 : 400,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {monthUtils.format(month, 'MMM')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={months.length + 1} style={{ padding: 12 }}>
                  <Trans>Loading…</Trans>
                </td>
              </tr>
            ) : (
              rows.map(row => {
                const isUnallocated = row.id === null;
                const values =
                  reading === 'balance' ? row.balances : row.changes;
                return (
                  <tr key={row.id ?? 'unallocated'}>
                    <td
                      style={{
                        padding: '6px 8px',
                        borderTop: isUnallocated
                          ? `1px solid ${theme.tableBorder}`
                          : undefined,
                        fontStyle: isUnallocated ? 'italic' : undefined,
                        color: isUnallocated
                          ? theme.pageTextSubdued
                          : theme.pageText,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isUnallocated ? t('Unallocated') : row.name}
                    </td>
                    {values.map((value, i) => (
                      <td
                        key={months[i]}
                        style={{
                          padding: '6px 8px',
                          textAlign: 'right',
                          borderTop: isUnallocated
                            ? `1px solid ${theme.tableBorder}`
                            : undefined,
                          ...styles.tnum,
                          // A zero is noise here; the eye should land on the
                          // months where something actually happened.
                          color:
                            value === 0
                              ? theme.tableTextInactive
                              : value < 0
                                ? theme.errorText
                                : theme.pageText,
                        }}
                      >
                        {value === 0 ? '—' : integerToCurrency(value)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </View>
    </View>
  );
}
