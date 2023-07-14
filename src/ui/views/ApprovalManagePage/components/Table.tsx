// import React from 'react';

// function TableHead({ children }: React.PropsWithChildren<{}>) {
//   return <div className="approvals-manager__table-head">{children}</div>;
// }

// function TableBody({ children }: React.PropsWithChildren<{}>) {
//   return <div className="approvals-manager__table-body">{children}</div>;
// }

// function TableRow({ children }: React.PropsWithChildren<{}>) {
//   return <div className="approvals-manager__table-row">{children}</div>;
// }

// export default function ApprovalsTable({ children }: React.PropsWithChildren<{}>) {
//   return <>
//     {children}
//   </>;
// }

// ApprovalsTable.Head = TableHead;
// ApprovalsTable.Body = TableBody;
// ApprovalsTable.Row = TableRow;

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnGroupType, ColumnType } from 'antd/lib/table';

import classNames from 'classnames';
import clsx from 'clsx';
import ResizeObserver from 'rc-resize-observer';
import { VariableSizeGrid as VGrid } from 'react-window';

const DEFAULT_SCROLL = { y: 300, x: '100vw' };
const ROW_INNER_HEIGHT = 60;
const ROW_GAP = 12;

const ROW_HEIGHT = ROW_INNER_HEIGHT + ROW_GAP * 2;

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

export function VirtualTable<RecordType extends object>({
  isLoading,
  markHoverRow,
  vGridRef,
  onClickRow,
  ...props
}: TableProps<RecordType> & {
  isLoading?: boolean;
  markHoverRow?: boolean;
  vGridRef?: React.MutableRefObject<VGrid>;
  onClickRow?: (e: React.MouseEvent, record: RecordType) => void;
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

  const localGridRef = useRef<VGrid>();

  const gridRef = vGridRef || localGridRef;
  const [connectObject] = useState<any>(() => {
    const obj = {};
    Object.defineProperty(obj, 'scrollLeft', {
      get: () => {
        if (gridRef.current) {
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
      shouldForceUpdate: true,
    });
  };

  useEffect(() => resetVirtualGrid, [tableWidth]);

  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

  const renderVirtualList = (
    rowData: readonly RecordType[],
    { scrollbarSize, ref, onScroll }: any
  ) => {
    ref.current = connectObject;
    const totalHeight = rowData.length * ROW_HEIGHT;

    return (
      <VGrid
        ref={gridRef}
        className="am-virtual-grid"
        columnCount={mergedColumns.length}
        columnWidth={(index: number) => {
          const { width } = mergedColumns[index];
          return totalHeight > (scroll!.y! as number) &&
            index === mergedColumns.length - 1
            ? (width as number) - scrollbarSize - 1
            : (width as number);
        }}
        rowCount={rowData.length}
        rowHeight={() => ROW_HEIGHT}
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
              className={classNames('am-virtual-table-cell', {
                'is-first-cell': columnIndex === 0,
                'is-last-cell': columnIndex === mergedColumns.length - 1,
                'is-hovered-cell': markHoverRow && hoveredRowIndex === rowIndex,
              })}
              onClick={(e) => onClickRow?.(e, record)}
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
          body: !isLoading ? renderVirtualList : undefined,
        }}
      />
    </ResizeObserver>
  );
}
