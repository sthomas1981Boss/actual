import { useTranslation } from 'react-i18next';

// The set of columns in the transaction table, in their default order.
export const TRANSACTION_TABLE_COLUMN_IDS = [
  'date',
  'account',
  'payee',
  'notes',
  'group',
  'category',
  'payment',
  'deposit',
  'balance',
  'cleared',
] as const;

export type TransactionTableColumnId =
  (typeof TRANSACTION_TABLE_COLUMN_IDS)[number];

export type TransactionTableColumn = {
  id: TransactionTableColumnId;
  hidden: boolean;
  // Width in pixels once the user has dragged the column's edge. Absent means
  // "use the default below", which is what every column starts with.
  width?: number;
};

// Bounds for user-resized columns: narrow enough to be useful, wide enough to
// keep a header label readable and to avoid a column swallowing the table.
export const MIN_COLUMN_WIDTH = 40;
export const MAX_COLUMN_WIDTH = 800;

// Single source of truth for column widths: the header cell, the body cell and
// the dedicated cell components (payee, notes) all read from here, so a column
// can never end up wider in the header than in the rows.
//
// `flex-N` takes N shares of the free space (see `flexWidthStyle` in
// components/table.tsx). Notes carries the raw bank labels and so gets the
// largest share. The amount columns are deliberately absent: they size
// themselves from their content through `useAmountColumnWidths`.
export const TRANSACTION_TABLE_COLUMN_WIDTHS = {
  date: 110,
  account: 'flex',
  payee: 'flex-2',
  notes: 'flex-3',
  group: 'flex',
  category: 'flex-2',
  cleared: 38,
} as const satisfies Partial<Record<TransactionTableColumnId, string | number>>;

/**
 * Effective width of a column: the width the user dragged it to, or its
 * default. Returns undefined for the amount columns, which size themselves
 * from their content unless explicitly resized.
 */
export function getTransactionTableColumnWidth(
  id: TransactionTableColumnId,
  columns: TransactionTableColumn[],
): string | number | undefined {
  const resized = columns.find(column => column.id === id)?.width;
  return (
    resized ??
    (
      TRANSACTION_TABLE_COLUMN_WIDTHS as Partial<
        Record<TransactionTableColumnId, string | number>
      >
    )[id]
  );
}

// The date column can be reordered but never hidden: it drives keyboard
// navigation (new transactions start editing on the date field) so it must
// always be visible.
export function isTransactionTableColumnLocked(
  id: TransactionTableColumnId,
): boolean {
  return id === 'date';
}

// Display-only columns render plain values with no editing, so they are
// excluded from keyboard-focusable fields.
export function isTransactionTableColumnDisplayOnly(
  id: TransactionTableColumnId,
): boolean {
  return id === 'balance' || id === 'group';
}

// Child (split) transactions render the date/account cells as blank
// placeholders, so those columns can't be focused or edited in child rows.
export function isTransactionTableColumnAvailableInChildRows(
  id: TransactionTableColumnId,
): boolean {
  return id !== 'date' && id !== 'account';
}

// User-facing column names, shared by the column manager modal and the
// table header.
export function useTransactionTableColumnLabels(): Record<
  TransactionTableColumnId,
  string
> {
  const { t } = useTranslation();

  return {
    date: t('Date'),
    account: t('Account'),
    payee: t('Payee'),
    notes: t('Notes'),
    group: t('Category group'),
    category: t('Category'),
    payment: t('Payment'),
    deposit: t('Deposit'),
    balance: t('Running balance'),
    cleared: t('Cleared'),
  };
}

function isColumnHiddenByDefault(id: TransactionTableColumnId): boolean {
  // The running balance and category group columns are opt-in, matching the
  // app's historical default of not showing them.
  return id === 'balance' || id === 'group';
}

export function getDefaultTransactionTableColumns(): TransactionTableColumn[] {
  return TRANSACTION_TABLE_COLUMN_IDS.map(id => ({
    id,
    hidden: isColumnHiddenByDefault(id),
  }));
}

function isKnownColumnId(id: unknown): id is TransactionTableColumnId {
  return (
    typeof id === 'string' &&
    (TRANSACTION_TABLE_COLUMN_IDS as readonly string[]).includes(id)
  );
}

/**
 * Parse the serialized column configuration from the synced pref. Invalid or
 * unknown entries are dropped, and any columns missing from the saved value
 * (e.g. because they were added in a later version, or were not available in
 * the view when it was saved) are inserted at their default position.
 */
export function parseTransactionTableColumns(
  raw: string | undefined,
): TransactionTableColumn[] {
  let saved: TransactionTableColumn[] = [];

  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (
            entry &&
            typeof entry === 'object' &&
            'id' in entry &&
            isKnownColumnId(entry.id) &&
            !saved.some(c => c.id === entry.id)
          ) {
            const hidden =
              'hidden' in entry &&
              entry.hidden === true &&
              !isTransactionTableColumnLocked(entry.id);
            // A width out of bounds (hand-edited pref, older format, NaN) is
            // dropped rather than clamped: falling back to the default is
            // safer than honouring a value we don't trust.
            const width =
              'width' in entry &&
              typeof entry.width === 'number' &&
              Number.isFinite(entry.width) &&
              entry.width >= MIN_COLUMN_WIDTH &&
              entry.width <= MAX_COLUMN_WIDTH
                ? entry.width
                : undefined;
            saved.push({ id: entry.id, hidden, ...(width ? { width } : {}) });
          }
        }
      }
    } catch {
      // Malformed pref value; fall back to the defaults
      saved = [];
    }
  }

  // At least one amount column must stay visible — new transactions need an
  // amount input. Restore both when a saved config hides the whole pair.
  const payment = saved.find(c => c.id === 'payment');
  const deposit = saved.find(c => c.id === 'deposit');
  if (payment?.hidden && deposit?.hidden) {
    payment.hidden = false;
    deposit.hidden = false;
  }

  // Insert any missing columns at their default relative position
  for (const id of TRANSACTION_TABLE_COLUMN_IDS) {
    if (saved.some(c => c.id === id)) {
      continue;
    }
    const defaultIdx = TRANSACTION_TABLE_COLUMN_IDS.indexOf(id);
    const insertAt = saved.findIndex(
      c => TRANSACTION_TABLE_COLUMN_IDS.indexOf(c.id) > defaultIdx,
    );
    const column = { id, hidden: isColumnHiddenByDefault(id) };
    if (insertAt === -1) {
      saved.push(column);
    } else {
      saved.splice(insertAt, 0, column);
    }
  }

  return saved;
}
