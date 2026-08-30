import { useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './columns';
import type { TransactionTableColumnId } from './columns';
import { useColumnResize } from './ColumnWidthsContext';

// Drag handle sitting on a header cell's right edge. The move/up listeners go
// on `window` rather than the handle: the pointer routinely leaves the 6px
// strip while dragging, and a handle-bound listener would drop the gesture.

type ColumnResizeHandleProps = {
  id: TransactionTableColumnId;
  // Measures the header cell being resized. A flex column has no width of its
  // own to read, so the drag starts from its rendered width.
  cellRef: RefObject<HTMLDivElement | null>;
};

export function ColumnResizeHandle({ id, cellRef }: ColumnResizeHandleProps) {
  const onResize = useColumnResize();
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  if (!onResize) {
    return null;
  }

  const onMouseDown = (e: ReactMouseEvent) => {
    // Left button only, and never let the header's sort handler fire.
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const startWidth = cellRef.current?.getBoundingClientRect().width ?? 0;
    drag.current = { startX: e.clientX, startWidth };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!drag.current) {
        return;
      }
      const width = Math.round(
        Math.min(
          MAX_COLUMN_WIDTH,
          Math.max(
            MIN_COLUMN_WIDTH,
            drag.current.startWidth + (moveEvent.clientX - drag.current.startX),
          ),
        ),
      );
      // Live feedback without a round trip through the synced pref: the
      // definitive width is saved once, on mouse up.
      if (cellRef.current) {
        cellRef.current.style.flex = 'none';
        cellRef.current.style.width = `${width}px`;
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      const width = cellRef.current?.getBoundingClientRect().width;
      drag.current = null;
      if (width) {
        onResize(id, Math.round(width));
      }
    };

    // Keep the resize cursor and kill text selection for the whole gesture.
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <View
      onMouseDown={onMouseDown}
      data-testid={`resize-${id}`}
      style={{
        position: 'absolute',
        top: 0,
        right: -3,
        bottom: 0,
        width: 6,
        cursor: 'col-resize',
        zIndex: 1,
        ':hover': { backgroundColor: theme.tableBorderSeparator },
      }}
    />
  );
}
