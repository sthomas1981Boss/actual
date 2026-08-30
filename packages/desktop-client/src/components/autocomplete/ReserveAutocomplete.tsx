import type { ComponentProps, CSSProperties } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { styles } from '@actual-app/components/styles';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { SavingsReserveEntity } from '@actual-app/core/types/models';
import { css, cx } from '@emotion/css';
import { useQuery } from '@tanstack/react-query';

import { reserveQueries } from '#reserves/queries';

import { Autocomplete } from './Autocomplete';

// A flat list, unlike categories: reserves have no grouping, and adding one
// would only get in the way of a handful of provisions.

type ReserveListProps = {
  items: SavingsReserveEntity[];
  getItemProps?: (arg: {
    item: SavingsReserveEntity;
  }) => ComponentProps<typeof View>;
  highlightedIndex: number;
  embedded?: boolean;
};

function ReserveList({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
}: ReserveListProps) {
  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        {items.map((item, index) => (
          <ReserveItem
            key={item.id}
            {...(getItemProps ? getItemProps({ item }) : null)}
            item={item}
            highlighted={highlightedIndex === index}
            embedded={embedded}
          />
        ))}
      </View>
    </View>
  );
}

type ReserveItemProps = {
  item: SavingsReserveEntity;
  className?: string;
  style?: CSSProperties;
  highlighted?: boolean;
  embedded?: boolean;
};

function ReserveItem({
  item,
  className,
  highlighted,
  embedded,
  ...props
}: ReserveItemProps) {
  const { isNarrowWidth } = useResponsive();
  const narrowStyle = isNarrowWidth
    ? {
        ...styles.mobileMenuItem,
        borderRadius: 0,
        borderTop: `1px solid ${theme.pillBorder}`,
      }
    : {};

  return (
    <View
      className={cx(
        className,
        css({
          backgroundColor: highlighted
            ? theme.menuAutoCompleteBackgroundHover
            : 'transparent',
          padding: 4,
          paddingLeft: 20,
          borderRadius: embedded ? 4 : 0,
          ...narrowStyle,
        }),
      )}
      data-testid={`${item.name}-reserve-item`}
      {...props}
    >
      <TextOneLine>{item.name}</TextOneLine>
    </View>
  );
}

type ReserveAutocompleteProps = ComponentProps<
  typeof Autocomplete<SavingsReserveEntity>
> & {
  embedded?: boolean;
};

export function ReserveAutocomplete({
  embedded,
  ...props
}: ReserveAutocompleteProps) {
  const { data: reserves = [] } = useQuery(reserveQueries.list());

  return (
    <Autocomplete
      strict
      highlightFirst
      embedded={embedded}
      suggestions={reserves}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <ReserveList
          items={items}
          embedded={embedded}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
        />
      )}
      {...props}
    />
  );
}
