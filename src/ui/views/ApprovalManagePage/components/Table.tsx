import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnGroupType, ColumnType } from 'antd/lib/table';

import classNames from 'classnames';
import clsx from 'clsx';
import ResizeObserver from 'rc-resize-observer';
import { VariableSizeGrid as VGrid } from 'react-window';
import { ROW_HEIGHT, SCROLLBAR_WIDTH } from '../constant';

const DEFAULT_SCROLL = { y: 300, x: '100vw' };

function TableHeadCell({
  children,
  ...props
}: React.PropsWithChildren<{
  className?: string;
}>) {
  return (
    <th
      {...props}
      className={classNames('am-virtual-table-head-cell', props.className)}
    >
      {children}
    </th>
  );
}

export type HandleClickTableRow<T> = (ctx: {
  event: React.MouseEvent;
  record: T;
  rowIndex: number;
  columnIndex: number;
  columnKey: ColumnType<T>['key'];
}) => any;

export function VirtualTable<RecordType extends object>({
  markHoverRow,
  vGridRef,
  onClickRow,
  getRowHeight,
  getTotalHeight,
  getCellKey,
  showScrollbar = true,
  ...props
}: TableProps<RecordType> & {
  markHoverRow?: boolean;
  vGridRef?: React.RefObject<VGrid>;
  onClickRow?: HandleClickTableRow<RecordType>;
  getTotalHeight?: (rows: readonly RecordType[]) => number;
  getRowHeight?: (
    row: RecordType,
    idx: number,
    rows: readonly RecordType[]
  ) => number | void;
  getCellKey?: (params: {
    columnIndex: number;
    rowIndex: number;
    data: RecordType;
  }) => string | number;
  showScrollbar?: boolean;
}) {
  const { columns, scroll = { ...DEFAULT_SCROLL } } = props;
  const [tableWidth, setTableWidth] = useState(0);

  const widthColumnCount = useMemo(
    () => columns!.filter(({ width }) => !width).length,
    [columns]
  );
  const mergedColumns = useMemo(() => {
    return columns!.map((column) => {
      if (column.width) {
        return column;
      }

      return {
        ...column,
        width: Math.floor(tableWidth / widthColumnCount),
      };
    });
  }, [columns, tableWidth, widthColumnCount]);

  const localGridRef = useRef<VGrid>(null);

  const gridRef = vGridRef || localGridRef;
  const [connectObject] = useState<any>(() => {
    const obj = {};
    Object.defineProperty(obj, 'scrollLeft', {
      get: () => {
        if (gridRef.current) {
          // @ts-expect-error state is expected as {}, but it is not
          return gridRef.current?.state?.scrollLeft;
        }
        return null;
      },
      set: (scrollLeft: number) => {
        if (gridRef.current) {
          gridRef.current.scrollTo({ scrollLeft });
        }
      },
    });

    return obj;
  });

  const resetVirtualGrid = () => {
    gridRef.current?.resetAfterIndices({
      columnIndex: 0,
      rowIndex: 0,
      shouldForceUpdate: true,
    });
  };

  useEffect(() => resetVirtualGrid, [tableWidth]);

  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

  const totalHeight = useMemo(() => {
    return (
      getTotalHeight?.(props.dataSource || []) ||
      (props.dataSource?.length ?? 0) * ROW_HEIGHT
    );
  }, [getTotalHeight, props.dataSource]);

  const renderVirtualList = (
    rowData: readonly RecordType[],
    { scrollbarSize, ref, onScroll }: any
  ) => {
    ref.current = connectObject;
    // const totalHeight = rowData.length * ROW_HEIGHT;

    return (
      <VGrid
        ref={gridRef}
        className="am-virtual-grid"
        itemKey={(params) => {
          const keyStr = getCellKey?.(params);
          if (keyStr) return keyStr;

          const idValue = (params.data as any)?.$id || (params.data as any)?.id;
          return `${params.rowIndex}-${params.columnIndex}-${idValue}`;
        }}
        columnCount={mergedColumns.length}
        columnWidth={(index: number) => {
          const { width } = mergedColumns[index];

          if (!showScrollbar) return width as number;

          return totalHeight > (scroll!.y! as number) &&
            index === mergedColumns.length - 1
            ? (width as number) - SCROLLBAR_WIDTH - 1
            : (width as number);
        }}
        rowCount={rowData.length}
        rowHeight={(rowIndex: number) => {
          return (
            getRowHeight?.(rowData[rowIndex], rowIndex, rowData) ?? ROW_HEIGHT
          );
        }}
        height={scroll!.y as number}
        width={tableWidth}
        onScroll={({ scrollLeft }: { scrollLeft: number }) => {
          onScroll({ scrollLeft });
        }}
      >
        {({
          columnIndex,
          rowIndex,
          style,
        }: {
          columnIndex: number;
          rowIndex: number;
          style: React.CSSProperties;
        }) => {
          const columnConfig = mergedColumns[columnIndex];
          const record = rowData[rowIndex];

          let cellNode: React.ReactNode = null;
          let cellValue: any = null;
          if ((columnConfig as ColumnType<RecordType>).dataIndex) {
            cellValue =
              record[
                (columnConfig as ColumnType<RecordType>).dataIndex as string
              ];
            cellNode = cellValue;
          }

          if (
            typeof (columnConfig as ColumnGroupType<RecordType>).render ===
            'function'
          ) {
            cellNode =
              (columnConfig as ColumnGroupType<RecordType>).render!(
                cellValue,
                record,
                rowIndex
              ) || null;
          }

          return (
            <div
              // pointless, see itemKey property of VGrid
              key={`r-${rowIndex}-c-${columnIndex}-${columnConfig.key}`}
              className={classNames(
                'am-virtual-table-cell',
                columnConfig.className,
                {
                  'is-first-row': rowIndex === 0,
                  'is-last-row': rowIndex === rowData.length - 1,
                  'is-first-cell': columnIndex === 0,
                  'is-last-cell': columnIndex === mergedColumns.length - 1,
                  'is-hovered-cell':
                    markHoverRow && hoveredRowIndex === rowIndex,
                }
              )}
              onClick={(event) =>
                onClickRow?.({
                  event,
                  record,
                  rowIndex,
                  columnIndex,
                  columnKey: columnConfig.key,
                })
              }
              style={style}
              onMouseEnter={() => {
                if (!markHoverRow) return;
                setHoveredRowIndex(rowIndex);
              }}
            >
              <div className={classNames('am-virtual-table-cell-inner')}>
                {cellNode}
              </div>
            </div>
          );
        }}
      </VGrid>
    );
  };

  return (
    <ResizeObserver
      onResize={({ width }) => {
        setTableWidth(width);
      }}
    >
      <Table<RecordType>
        {...props}
        className={clsx('am-virtual-table', props.className)}
        columns={mergedColumns}
        pagination={false}
        components={{
          header: {
            cell: TableHeadCell,
          },
          body: !props.loading ? renderVirtualList : undefined,
        }}
      />
    </ResizeObserver>
  );
}
