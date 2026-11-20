import { Table } from 'antd';
import { TableProps, ColumnType } from 'antd/lib/table';
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { ReactComponent as RcIconEmpty } from '@/ui/assets/perps/IconHistoryEmpty.svg';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import ResizeObserver from 'rc-resize-observer';
import { useThemeMode } from '@/ui/hooks/usePreference';
import clsx from 'clsx';
import styles from './index.module.css';

// Two stacked triangles used as the column sort indicator. The active direction
// (up = ascend, down = descend) is painted with the title colour, the other
// stays muted. `order === null` keeps both muted (the hover / inactive look).
const activeIconColor = 'var(--rb-neutral-title-1)';
const inactiveIconColor = 'var(--rb-neutral-secondary)';

export const SortIcon: React.FC<{ order: 'ascend' | 'descend' | null }> = ({
  order,
}) => {
  const upColor = order === 'ascend' ? activeIconColor : inactiveIconColor;
  const downColor = order === 'descend' ? activeIconColor : inactiveIconColor;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
    >
      {/* upward triangle (top) — highlighted when ascending */}
      <path
        d="M3 4.5L6 1.5L9 4.5L3 4.5Z"
        style={{ fill: upColor, stroke: upColor }}
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      {/* downward triangle (bottom) — highlighted when descending */}
      <path
        d="M9 7.5L6 10.5L3 7.5H9Z"
        style={{ fill: downColor, stroke: downColor }}
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Types for virtual row data
interface VirtualRowData<T> {
  columns: ColumnType<T>[];
  rawData: T[];
  columnWidths: number[];
}

// Virtual row component for react-window
function VirtualRow<T extends object>({
  index,
  style,
  data,
}: ListChildComponentProps<VirtualRowData<T>>) {
  const { columns, rawData, columnWidths } = data;
  const record = rawData[index];

  return (
    <div className="virtual-row" style={style}>
      {columns.map((column, colIndex) => {
        const { dataIndex } = column;

        let value: unknown;
        if (Array.isArray(dataIndex)) {
          value = dataIndex.reduce((obj: unknown, key: string | number) => {
            if (obj && typeof obj === 'object') {
              return (obj as Record<string | number, unknown>)[key];
            }
            return undefined;
          }, record as unknown);
        } else {
          value = (record as Record<string | number, unknown>)[
            dataIndex as string | number
          ];
        }

        const renderedValue = column.render
          ? column.render(value, record, index)
          : value;

        const cellContent: React.ReactNode =
          renderedValue &&
          typeof renderedValue === 'object' &&
          !React.isValidElement(renderedValue) &&
          'children' in renderedValue
            ? (renderedValue.children as React.ReactNode)
            : (renderedValue as React.ReactNode);

        const cellKey = column.key ?? String(dataIndex) ?? colIndex;
        const cellWidth = columnWidths[colIndex] || 0;

        return (
          <div
            key={String(cellKey)}
            className="virtual-cell"
            style={{ minWidth: cellWidth }}
          >
            {cellContent}
          </div>
        );
      })}
    </div>
  );
}

interface CommonTableProps<T extends object> extends TableProps<T> {
  columns: ColumnType<T>[];
  dataSource: T[];
  defaultSortField?: string;
  defaultSortOrder?: 'ascend' | 'descend';
  emptyMessage?: string;
  virtual?: boolean;
  rowHeight?: number;
}

type SortOrder = 'ascend' | 'descend';
type SortDirections = SortOrder[];

interface SortedColumnType<T> extends ColumnType<T> {
  sortOrder: SortOrder | null;
  sortDirections: SortDirections;
}

export const CommonTable = <T extends object>({
  columns,
  onChange,
  dataSource,
  defaultSortField,
  defaultSortOrder = 'descend',
  emptyMessage,
  virtual = false,
  rowHeight = 44,
  ...restProps
}: CommonTableProps<T>) => {
  const { isDarkTheme } = useThemeMode();
  const [sortedInfo, setSortedInfo] = useState<{
    field: string | null;
    order: SortOrder | null;
  }>({
    field: defaultSortField || null,
    order: defaultSortField ? defaultSortOrder : null,
  });

  // Ref for measuring header column widths
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);

  const handleTableChange: TableProps<T>['onChange'] = useCallback(
    (pagination, filters, sorter, extra) => {
      const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
      const clickedField = singleSorter?.field as string | undefined;

      if (clickedField === sortedInfo.field) {
        const newOrder: SortOrder =
          sortedInfo.order === 'ascend' ? 'descend' : 'ascend';
        setSortedInfo({
          field: clickedField,
          order: newOrder,
        });

        if (singleSorter) {
          singleSorter.order = newOrder;
        }
      } else {
        // First click on a new column sorts descending.
        setSortedInfo({
          field: clickedField || null,
          order: clickedField ? 'descend' : null,
        });

        if (singleSorter && clickedField) {
          singleSorter.order = 'descend';
        }
      }

      onChange?.(pagination, filters, sorter, extra);
    },
    [sortedInfo, onChange]
  );

  const enhancedColumns = useMemo((): Array<
    ColumnType<T> | SortedColumnType<T>
  > => {
    return columns.map((col) => {
      if (!col.sorter) {
        return col;
      }

      const originalTitle = col.title;
      const renderedTitle: React.ReactNode =
        typeof originalTitle === 'function'
          ? originalTitle({} as Parameters<typeof originalTitle>[0])
          : originalTitle;
      const fieldKey = (col.key || col.dataIndex) as string | undefined;

      const enhanced: SortedColumnType<T> = {
        ...col,
        sortOrder: sortedInfo.field === fieldKey ? sortedInfo.order : null,
        sortDirections: ['ascend', 'descend'] as SortDirections,
        title: (
          <>
            {renderedTitle}
            <span className="sort-icon">
              <SortIcon
                order={sortedInfo.field === fieldKey ? sortedInfo.order : null}
              />
            </span>
          </>
        ),
      };

      return enhanced;
    });
  }, [columns, sortedInfo]);

  // Sort data for virtual mode
  const sortedData = useMemo((): T[] => {
    if (!sortedInfo.field) {
      return dataSource;
    }

    const col = columns.find(
      (c) => ((c.key || c.dataIndex) as string) === sortedInfo.field
    );

    if (!col || !col.sorter || typeof col.sorter !== 'function') {
      return dataSource;
    }

    const sorterFn = col.sorter as (a: T, b: T) => number;
    const sorted = [...dataSource].sort(sorterFn);
    return sortedInfo.order === 'descend' ? sorted.reverse() : sorted;
  }, [dataSource, columns, sortedInfo]);

  // Measure column widths from header after render
  const measureColumnWidths = useCallback(() => {
    if (!headerRef.current) return;

    const headerCells = headerRef.current.querySelectorAll(
      '.ant-table-thead > tr > th'
    );
    const widths: number[] = [];
    headerCells.forEach((cell) => {
      widths.push((cell as HTMLElement).offsetWidth);
    });
    setColumnWidths(widths);
  }, []);

  const handleContainerResize = useCallback(
    ({ width }: { width: number }) => {
      setContainerWidth(width);
      // Re-measure column widths after resize
      setTimeout(measureColumnWidths, 0);
    },
    [measureColumnWidths]
  );

  const handleBodyResize = useCallback(({ height }: { height: number }) => {
    setBodyHeight(height);
  }, []);

  // Virtual list item data
  const virtualItemData = useMemo(
    (): VirtualRowData<T> => ({
      columns: enhancedColumns as ColumnType<T>[],
      rawData: sortedData,
      columnWidths,
    }),
    [enhancedColumns, sortedData, columnWidths]
  );

  // List height calculation - use actual body height from container
  const listHeight = useMemo(() => {
    if (bodyHeight === 0) {
      return 0; // Wait for measurement
    }
    // Use actual container height, or content height if smaller
    return Math.min(sortedData.length * rowHeight, bodyHeight);
  }, [sortedData.length, rowHeight, bodyHeight]);

  if (dataSource.length === 0) {
    return (
      <div
        className={styles.wrapper}
        style={
          {
            '--common-table-row-height': `${rowHeight}px`,
          } as React.CSSProperties
        }
      >
        <div className="flex flex-col items-center justify-center gap-[4px] pt-[100px]">
          <RcIconEmpty className="text-rb-neutral-foot" />
          <div className="text-[12px] leading-[14px] text-rb-neutral-foot text-center">
            {emptyMessage || 'No data'}
          </div>
        </div>
      </div>
    );
  }

  if (virtual) {
    return (
      <ResizeObserver onResize={handleContainerResize}>
        <div
          className={clsx(
            styles.virtualWrapper,
            isDarkTheme && styles.virtualWrapperDark
          )}
        >
          {/* Header-only table */}
          <div className="virtual-table-header" ref={headerRef}>
            <Table<T>
              {...restProps}
              dataSource={[]}
              columns={enhancedColumns as ColumnType<T>[]}
              onChange={handleTableChange}
              pagination={false}
            />
          </div>

          {/* Virtualized body - flex:1 will fill remaining space */}
          <ResizeObserver onResize={handleBodyResize}>
            <div className="virtual-table-body" ref={bodyRef}>
              {listHeight > 0 && (
                <List<VirtualRowData<T>>
                  height={listHeight}
                  itemCount={sortedData.length}
                  itemSize={rowHeight}
                  width={containerWidth || '100%'}
                  itemData={virtualItemData}
                  style={{ overflowX: 'hidden' }}
                >
                  {VirtualRow as React.ComponentType<ListChildComponentProps>}
                </List>
              )}
            </div>
          </ResizeObserver>
        </div>
      </ResizeObserver>
    );
  }

  return (
    <div
      className={styles.wrapper}
      style={
        {
          '--common-table-row-height': `${rowHeight}px`,
        } as React.CSSProperties
      }
    >
      <Table<T>
        {...restProps}
        dataSource={sortedData}
        columns={enhancedColumns as ColumnType<T>[]}
        onChange={handleTableChange}
        scroll={{ x: 'max-content', y: bodyHeight || 'auto' }}
      />
    </div>
  );
};
