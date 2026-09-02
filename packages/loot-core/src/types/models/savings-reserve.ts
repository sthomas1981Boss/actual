export type SavingsReserveEntity = {
  id: string;
  name: string;
  sort_order?: number;
  /** Recurring monthly funding, in cents. Zero means no standing order. */
  monthly_amount: number;
};

/** A one-off amount put into (or taken out of) a reserve for a given month. */
export type SavingsReserveEntryEntity = {
  id: string;
  reserve_id: SavingsReserveEntity['id'];
  /** 'YYYY-MM' */
  month: string;
  amount: number;
};
