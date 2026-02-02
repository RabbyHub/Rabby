import { Table } from 'antd';
import { TableProps, ColumnType } from 'antd/lib/table';
import React, { useState, useMemo, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { ReactComponent as RcIconEmpty } from '@/ui/assets/perps/IconHistoryEmpty.svg';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import ResizeObserver from 'rc-resize-observer';
import { useThemeMode } from '@/ui/hooks/usePreference';

const Wrapper = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .ant-table-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .ant-spin-nested-loading {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .ant-spin-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .ant-table {
    background-color: transparent;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .ant-table-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .ant-table-container:after {
    box-shadow: none !important;
  }

  .ant-table-header {
    flex-shrink: 0;
    .ant-table-thead > tr > th.ant-table-cell-scrollbar:last-child {
      padding-right: 0;
      display: none;
    }

    .ant-table-thead > tr > th:nth-last-child(2) {
      padding-right: 16px; // add 4px for scrollbar
    }
  }

  .ant-table-body {
    flex: 1;
    overflow-y: auto !important;
    overflow-x: hidden !important;
  }

  .ant-table-expanded-row {
    .ant-table-cell {
      background-color: transparent;
    }
  }

  .ant-table-thead > tr > th {
    color: var(--rb-neutral-foot, #6a7587);
    font-size: 13px;
    font-weight: 400;
    background-color: var(--rb-neutral-bg-1, #fff);
    border: none;

    padding: 12px 8px;

    &:first-child {
      padding-left: 16px;
    }

    &:last-child {
      padding-right: 16px;
    }

    &.ant-table-column-has-sorters {
      padding-top: 0;
      padding-bottom: 0;
      cursor: pointer;
      transition: none;

      .ant-table-column-sorters {
        padding: 12px 0;
      }

      /* Hover state */
      &:hover {
        color: var(--rb-neutral-title-1, #192945);
        background-color: transparent;
      }

      /* Active (sorted) state */
      &.ant-table-column-sort {
        color: var(--rb-neutral-title-1, #192945);
      }
    }

    /* Hide default antd sort icons */
    .ant-table-column-sorter {
      display: none;
    }
  }

  .ant-table-tbody > tr > td {
    border-bottom: none;

    padding: 8px;

    &:first-child {
      padding-left: 16px;
    }

    &:last-child {
      padding-right: 16px;
    }

    .is-long-bg {
      background: linear-gradient(to right, #58c66920, #58c66900);
      border-left: 2px solid var(--rb-green-default, #58c669);
    }
    .is-short-bg {
      background: linear-gradient(to right, #ff453a20, #ff453a00);
      border-left: 2px solid var(--rb-red-default, #ff453a);
    }
  }

  .ant-table-tbody > tr.ant-table-row:hover > td {
    background-color: transparent;
  }

  .ant-table-tbody {
    td.ant-table-column-sort {
      background-color: transparent;
    }
  }
`;

// Virtual table wrapper - renders header separately from virtualized body
const VirtualWrapper = styled.div<{ isDarkTheme: boolean }>`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .virtual-table-header {
    flex-shrink: 0;

    .ant-table-wrapper {
      .ant-table {
        background-color: transparent;
      }
    }

    .ant-table-thead > tr > th {
      color: var(--rb-neutral-foot, #6a7587);
      font-size: 13px;
      font-weight: 400;
      background-color: var(--rb-neutral-bg-1, #fff);
      border: none;
      padding: 12px 8px;

      &:first-child {
        padding-left: 16px;
      }

      &:last-child {
        padding-right: 16px;
      }

      &.ant-table-column-has-sorters {
        padding-top: 0;
        padding-bottom: 0;
        cursor: pointer;
        transition: none;

        .ant-table-column-sorters {
          padding: 12px 0;
        }

        &:hover {
          color: var(--rb-neutral-title-1, #192945);
          background-color: transparent;
        }

        &.ant-table-column-sort {
          color: var(--rb-neutral-title-1, #192945);
        }
      }

      .ant-table-column-sorter {
        display: none;
      }
    }

    /* Hide the empty body in header-only table */
    .ant-table-tbody {
      display: none;
    }
  }

  .virtual-table-body {
    flex: 1;
    overflow: hidden;
  }

  .virtual-row {
    &:hover {
      background-color: ${({ isDarkTheme }) =>
        !isDarkTheme ? 'var(--rb-neutral-bg-0)' : 'var(--r-neutral-card-1)'};
    }
    display: flex;
    align-items: center;
    box-sizing: border-box;

    .virtual-cell {
      flex: 1;
      // flex-shrink: 0;
      padding: 8px;
      // overflow: hidden;
      box-sizing: border-box;

      &:first-child {
        padding-left: 16px;
      }

      &:last-child {
        padding-right: 16px;
      }
    }
  }
`;

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

        const cellContent = column.render
          ? column.render(value, record, index)
          : (value as React.ReactNode);

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
  defaultSortOrder = 'ascend',
  emptyMessage,
  virtual = false,
  rowHeight = 48,
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
        setSortedInfo({
          field: clickedField || null,
          order: clickedField ? 'ascend' : null,
        });

        if (singleSorter && clickedField) {
          singleSorter.order = 'ascend';
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
      const fieldKey = (col.key || col.dataIndex) as string | undefined;

      const enhanced: SortedColumnType<T> = {
        ...col,
        sortOrder: sortedInfo.field === fieldKey ? sortedInfo.order : null,
        sortDirections: ['ascend', 'descend'] as SortDirections,
        title: (
          <>
            {originalTitle}
            <span
              className="w-[16px] text-center"
              style={{
                opacity:
                  sortedInfo.field === fieldKey && sortedInfo.order ? 1 : 0,
              }}
            >
              {sortedInfo.order === 'ascend' ? '↑' : '↓'}
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
      <Wrapper>
        <div className="flex flex-col items-center justify-center gap-[4px] pt-[100px]">
          <RcIconEmpty className="text-rb-neutral-foot" />
          <div className="text-[12px] leading-[14px] text-rb-neutral-foot text-center">
            {emptyMessage || 'No data'}
          </div>
        </div>
      </Wrapper>
    );
  }

  if (virtual) {
    return (
      <ResizeObserver onResize={handleContainerResize}>
        <VirtualWrapper isDarkTheme={isDarkTheme}>
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
        </VirtualWrapper>
      </ResizeObserver>
    );
  }

  return (
    <Wrapper>
      <Table<T>
        {...restProps}
        dataSource={sortedData}
        columns={enhancedColumns as ColumnType<T>[]}
        onChange={handleTableChange}
        scroll={{ y: bodyHeight || 'auto' }}
      />
    </Wrapper>
  );
};
