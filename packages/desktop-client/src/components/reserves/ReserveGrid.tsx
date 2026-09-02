import { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as monthUtils from '@actual-app/core/shared/months';
import { integerToCurrency } from '@actual-app/core/shared/util';

import { useLocale } from '#hooks/useLocale';
import type { ReserveHistoryRow } from '#hooks/useReserveHistory';

import { EditableAmount } from './EditableAmount';

type ReserveGridProps = {
  months: string[];
  rows: ReserveHistoryRow[];
  envelopes: number[];
  unallocated: number[];
  firstProjectedIndex: number;
  isLoading: boolean;
  onSetMonthly: (id: string, amount: number) => void;
  onSetPayment: (id: string, month: string, amount: number) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string, amount: number) => void;
};

const cell = (isProjected: boolean, value: number) => ({
  padding: '2px 4px',
  textAlign: 'right' as const,
  whiteSpace: 'nowrap' as const,
  ...styles.tnum,
  // A projection is not a fact: it is dimmed so the eye separates what the
  // accounts really held from what the standing orders will add.
  opacity: isProjected ? 0.55 : 1,
  color:
    value === 0
      ? theme.tableTextInactive
      : value < 0
        ? theme.errorText
        : theme.pageText,
});

function RowMenu({
  onRename,
  onDelete,
  label,
}: {
  onRename: () => void;
  onDelete: () => void;
  label: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="bare"
        aria-label={t('Menu for {{name}}', { name: label })}
        onClick={() => setOpen(true)}
      >
        <SvgDotsHorizontalTriple width={13} height={13} />
      </Button>
      <Popover
        triggerRef={triggerRef}
        isOpen={open}
        isNonModal
        onOpenChange={setOpen}
      >
        <Menu
          items={[
            { name: 'rename', text: t('Rename') },
            { name: 'delete', text: t('Delete') },
          ]}
          onMenuSelect={name => {
            setOpen(false);
            if (name === 'rename') onRename();
            if (name === 'delete') onDelete();
          }}
        />
      </Popover>
    </>
  );
}

// One table, and only one: a reserve is a line, a month is a column, and the
// figure is what the reserve holds at the end of that month. Typing in a cell
// says what the balance should be then — the first figure typed is what starts
// the running total.
export function ReserveGrid({
  months,
  rows,
  envelopes,
  unallocated,
  firstProjectedIndex,
  isLoading,
  onSetMonthly,
  onSetPayment,
  onRename,
  onDelete,
}: ReserveGridProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const thisMonth = monthUtils.currentMonth();

  const headerCell = {
    padding: '6px 5px',
    textAlign: 'right' as const,
    color: theme.tableHeaderText,
    fontWeight: 400,
    whiteSpace: 'nowrap' as const,
  };

  return (
    <View style={{ overflowX: 'auto' }}>
      <table
        style={{ borderCollapse: 'collapse', ...styles.smallText }}
        aria-label={t('Reserves by month')}
      >
        <thead>
          <tr>
            <th style={{ ...headerCell, textAlign: 'left', minWidth: 128 }}>
              <Trans>Reserve</Trans>
            </th>
            <th style={{ ...headerCell, minWidth: 78 }}>
              <Trans>Per month</Trans>
            </th>
            {months.map((month, i) => (
              <th
                key={month}
                style={{
                  ...headerCell,
                  minWidth: 74,
                  fontWeight: month === thisMonth ? 600 : 400,
                  opacity: i >= firstProjectedIndex ? 0.55 : 1,
                  borderLeft:
                    i === firstProjectedIndex
                      ? `1px solid ${theme.tableBorder}`
                      : undefined,
                }}
              >
                {monthUtils.format(month, 'MMM', locale)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={months.length + 2} style={{ padding: 12 }}>
                <Trans>Loading…</Trans>
              </td>
            </tr>
          ) : (
            <>
              <tr>
                <td
                  style={{
                    padding: '6px 8px',
                    color: theme.pageTextSubdued,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Trans>Accounts balance</Trans>
                </td>
                <td />
                {envelopes.map((value, i) => (
                  <td
                    key={months[i]}
                    style={{
                      ...cell(i >= firstProjectedIndex, value),
                      padding: '6px 5px',
                      color: theme.pageTextSubdued,
                      borderLeft:
                        i === firstProjectedIndex
                          ? `1px solid ${theme.tableBorder}`
                          : undefined,
                    }}
                  >
                    {value === 0 ? '—' : integerToCurrency(value)}
                  </td>
                ))}
              </tr>

              {rows.map(row => (
                <tr key={row.id}>
                  <td style={{ padding: '2px 8px', whiteSpace: 'nowrap' }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      {row.name}
                      <RowMenu
                        label={row.name}
                        onRename={() => onRename(row.id, row.name)}
                        onDelete={() =>
                          onDelete(
                            row.id,
                            row.name,
                            row.balances[
                              Math.max(0, firstProjectedIndex - 1)
                            ] ?? 0,
                          )
                        }
                      />
                    </View>
                  </td>

                  <td style={{ padding: '2px 4px' }}>
                    <EditableAmount
                      value={row.monthlyAmount}
                      width={72}
                      ariaLabel={t('Monthly amount for {{name}}', {
                        name: row.name,
                      })}
                      onSave={amount => onSetMonthly(row.id, amount)}
                    />
                  </td>

                  {row.balances.map((value, i) => (
                    <td
                      key={months[i]}
                      style={{
                        ...cell(i >= firstProjectedIndex, value),
                        borderLeft:
                          i === firstProjectedIndex
                            ? `1px solid ${theme.tableBorder}`
                            : undefined,
                      }}
                    >
                      <EditableAmount
                        value={value}
                        width={70}
                        ariaLabel={t('{{name}}, {{month}}', {
                          name: row.name,
                          month: months[i],
                        })}
                        isTyped={row.typedMonths.includes(months[i])}
                        editValue={
                          row.typedMonths.includes(months[i])
                            ? row.payments[i]
                            : undefined
                        }
                        editPlaceholder={
                          row.monthlyAmount === 0
                            ? undefined
                            : integerToCurrency(row.monthlyAmount)
                        }
                        onSave={amount =>
                          onSetPayment(row.id, months[i], amount)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}

              <tr>
                <td
                  style={{
                    padding: '6px 8px',
                    borderTop: `1px solid ${theme.tableBorder}`,
                    fontStyle: 'italic',
                    color: theme.pageTextSubdued,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Trans>Unallocated</Trans>
                </td>
                <td style={{ borderTop: `1px solid ${theme.tableBorder}` }} />
                {unallocated.map((value, i) => (
                  <td
                    key={months[i]}
                    style={{
                      ...cell(i >= firstProjectedIndex, value),
                      padding: '6px 8px',
                      borderTop: `1px solid ${theme.tableBorder}`,
                      borderLeft:
                        i === firstProjectedIndex
                          ? `1px solid ${theme.tableBorder}`
                          : undefined,
                      color:
                        value < 0 ? theme.errorText : theme.pageTextSubdued,
                    }}
                  >
                    {value === 0 ? '—' : integerToCurrency(value)}
                  </td>
                ))}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </View>
  );
}
