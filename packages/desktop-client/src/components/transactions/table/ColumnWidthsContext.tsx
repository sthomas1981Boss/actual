import React, { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

import {
  getTransactionTableColumnWidth,
  TRANSACTION_TABLE_COLUMN_WIDTHS,
} from './columns';
import type {
  TransactionTableColumn,
  TransactionTableColumnId,
} from './columns';

// Column widths reach the header cell, the body cells and the dedicated cell
// components (payee, notes). Threading them as props would mean touching every
// component in between, several of which are memo()-wrapped for row rendering
// performance. A context keeps that chain untouched and guarantees a single
// value per column: a header can never end up wider than its cells.

type ColumnWidths = {
  widthOf: (id: TransactionTableColumnId) => string | number | undefined;
  onResize?: (id: TransactionTableColumnId, width: number) => void;
};

const ColumnWidthsContext = createContext<ColumnWidths>({
  widthOf: id =>
    (
      TRANSACTION_TABLE_COLUMN_WIDTHS as Partial<
        Record<TransactionTableColumnId, string | number>
      >
    )[id],
});

type ColumnWidthsProviderProps = {
  columns: TransactionTableColumn[];
  onResize?: (id: TransactionTableColumnId, width: number) => void;
  children: ReactNode;
};

export function ColumnWidthsProvider({
  columns,
  onResize,
  children,
}: ColumnWidthsProviderProps) {
  const value = useMemo(
    () => ({
      widthOf: (id: TransactionTableColumnId) =>
        getTransactionTableColumnWidth(id, columns),
      onResize,
    }),
    [columns, onResize],
  );

  return (
    <ColumnWidthsContext.Provider value={value}>
      {children}
    </ColumnWidthsContext.Provider>
  );
}

/**
 * Returns the lookup function rather than a single width: cells are rendered
 * from a `switch` over the column id, so calling a hook per column would make
 * the call conditional. Call this once at the top of a component and use the
 * returned function anywhere below.
 */
export function useColumnWidths() {
  return useContext(ColumnWidthsContext).widthOf;
}

export function useColumnResize() {
  return useContext(ColumnWidthsContext).onResize;
}
