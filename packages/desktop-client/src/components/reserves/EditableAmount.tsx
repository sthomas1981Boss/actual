import { useState } from 'react';

import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  currencyToInteger,
  integerToCurrency,
} from '@actual-app/core/shared/util';

type EditableAmountProps = {
  /** What the cell shows when it is not being edited. */
  value: number;
  onSave: (value: number) => void;
  width?: number;
  /** Shown instead of a zero, so an untouched cell reads as empty. */
  placeholder?: string;
  /**
   * What the field starts with. Left out, the field opens empty — which is what
   * a month cell wants: it displays a running total but what you type into it
   * is the payment for that month, and pre-filling it with the total would
   * invite you to type one for the other.
   */
  editValue?: number;
  /** Hint shown in the empty field: what that month currently pays in. */
  editPlaceholder?: string;
  /** Marks a month whose figure was typed rather than set by the standing order. */
  isTyped?: boolean;
  ariaLabel: string;
  emphasis?: boolean;
};

// Click the figure, type the new one. The whole point of the reserves table is
// that a provision is driven from it, so the amounts are editable where they
// are read.
//
// A plain field rather than the app's AmountInput: that one carries a separate
// sign toggle and keeps the sign of the previous value, so typing "100" over a
// negative cell yielded -100. Here what you type is what you get — "100" puts a
// hundred in, "-650" takes six hundred and fifty out.
export function EditableAmount({
  value,
  onSave,
  width = 120,
  placeholder = '—',
  editValue,
  editPlaceholder,
  isTyped = false,
  ariaLabel,
  emphasis = false,
}: EditableAmountProps) {
  const [editing, setEditing] = useState(false);

  const commit = (raw: string) => {
    setEditing(false);
    const trimmed = raw.trim();
    // An emptied cell means zero, which is how a typed figure is cleared and
    // the standing order takes the month back.
    const parsed = trimmed === '' ? 0 : currencyToInteger(trimmed);
    if (parsed !== null) onSave(parsed);
  };

  if (editing) {
    return (
      <Input
        aria-label={ariaLabel}
        defaultValue={
          editValue === undefined || editValue === 0
            ? ''
            : String(editValue / 100)
        }
        placeholder={editPlaceholder}
        autoFocus
        // Select on entry: clicking a cell means "replace this figure", and
        // without it the typed digits are appended to the old ones.
        onFocus={e => e.currentTarget.select()}
        style={{ width, textAlign: 'right', ...styles.tnum }}
        onBlur={e => commit(e.target.value)}
        onEnter={raw => commit(raw)}
        onEscape={() => setEditing(false)}
      />
    );
  }

  return (
    <View
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={() => setEditing(true)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setEditing(true);
        }
      }}
      style={{
        width,
        alignItems: 'flex-end',
        padding: '2px 4px',
        borderRadius: 4,
        cursor: 'pointer',
        ...styles.tnum,
        color:
          value === 0
            ? theme.tableTextInactive
            : value < 0
              ? theme.errorText
              : theme.pageText,
        // A month you set by hand is worth spotting among those the standing
        // order filled on its own.
        fontWeight: emphasis || isTyped ? 500 : undefined,
        textDecoration: isTyped
          ? `underline dotted ${theme.pageTextSubdued}`
          : undefined,
        textUnderlineOffset: 3,
      }}
    >
      {value === 0 ? placeholder : integerToCurrency(value)}
    </View>
  );
}
