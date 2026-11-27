import React, {
  useMemo,
  useCallback,
  useRef,
  useState,
  useLayoutEffect,
} from 'react';
import { ConfigProvider, Empty, Table } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnGroupType, ColumnType } from 'antd/lib/table';

import clsx from 'clsx';
import ResizeObserver from 'rc-resize-observer';
import type { RenderedCell } from 'rc-table/lib/interface';
import { Virtuoso } from 'react-virtuoso';
import { ROW_HEIGHT, SCROLLBAR_WIDTH } from '../constant';

import { ReactComponent as RcIconNoMatchCC } from '../icons/no-match-cc.svg';
import { SorterResult } from 'antd/lib/table/interface';
import { useTranslation } from 'react-i18next';
// import { useMutationObserver, useSize } from 'ahooks';

const DEFAULT_SCROLL = { y: 300, x: '100vw' };

function TableBodyEmpty({
  isLoading,
  loadingText = 'Loading...',
  emptyText = 'No Match',
}: {
  isLoading?: boolean;
  loadingText?: string;
  emptyText?: string;
}) {
  return (
    <Empty
      className="am-virtual-table-empty"
      image={
        <RcIconNoMatchCC className="w-[52px] h-[52px] text-r-neutral-body" />
      }
      description={isLoading ? loadingText : emptyText}
    />
  );
}

function TableHeadCell({
  children,
  ...props
}: React.PropsWithChildren<{
  className?: string;
}>) {
  return (
    <th
      {...props}
      className={clsx('am-virtual-table-head-cell', props.className)}
    >
      {children}
    </th>
  );
}

type GetRowHeight<RecordType> = (
  row: RecordType,
  idx: number,
  rows: readonly RecordType[]
) => number | void;

type IVirtualTableContext<RecordType> = {
  columns: (ColumnGroupType<RecordType> | ColumnType<RecordType>)[];
  columnWidths: number[];
  rowList: readonly RecordType[];
  getRowHeight?: GetRowHeight<RecordType>;
  sortingKey?: SorterResult<RecordType>['columnKey'];
  hoveredRowIndex?: number | null;
  onClickRow?: HandleClickTableRow<RecordType>;
  onMouseEnterCell?: (
    ctx: IVirtualTableCellPayload<RecordType> & {
      event: React.MouseEvent<HTMLDivElement>;
    }
  ) => void;
  getCellClassName?: (
    ctx: IVirtualTableCellPayload<RecordType>
  ) => string | undefined;
};

export type IVirtualTableCellPayload<RecordType> = {
  columnIndex: number;
  rowIndex: number;
  record: RecordType;
};

const isRenderedCell = <T extends object>(
  value: unknown
): value is RenderedCell<T> => {
  return (
    !!value &&
    typeof value === 'object' &&
    'children' in value &&
    'props' in value &&
    !React.isValidElement(value)
  );
};

function TableCell<RecordType extends object = any>({
  columnIndex,
  rowIndex,
  record,
  context,
}: IVirtualTableCellPayload<RecordType> & {
  context: IVirtualTableContext<RecordType>;
}) {
  const {
    rowList,
    columns,
    columnWidths,
    getCellClassName,
    onClickRow,
    hoveredRowIndex,
    onMouseEnterCell,
    sortingKey,
  } = context;

  const columnConfig = columns[columnIndex];

  const colConfig = columnConfig as ColumnType<RecordType>;

  const cellClassName = getCellClassName?.({
    columnIndex,
    rowIndex,
    record,
  });

  let cellNode: React.ReactNode = null;
  let cellValue: any = null;
  if (colConfig.dataIndex) {
    cellValue = record[colConfig.dataIndex as string];
    cellNode = cellValue;
  }

  if (typeof colConfig.render === 'function') {
    const renderedCell = colConfig.render(cellValue, record, rowIndex);

    if (isRenderedCell<RecordType>(renderedCell)) {
      cellNode = renderedCell.children ?? null;
    } else {
      cellNode = renderedCell as React.ReactNode;
    }
  }

  return (
    <div
      className={clsx(
        'am-virtual-table-cell relative shrink-0 w-(--am-cell-width)',
        columnConfig.className,
        cellClassName,
        `column-cell-J_key-${columnConfig.key}`,
        {
          'is-first-row': rowIndex === 0,
          'is-last-row': rowIndex === rowList.length - 1,
          'is-first-cell': columnIndex === 0,
          'is-last-cell': columnIndex === columns.length - 1,
          'is-hovered-row-cell': hoveredRowIndex === rowIndex,
          'is-sorting-cell': columnConfig.key === sortingKey,
        }
      )}
      style={
        {
          '--am-cell-width': `${columnWidths[columnIndex]}px`,
        } as React.CSSProperties
      }
      onClick={(event) =>
        onClickRow?.({
          event,
          record,
          rowIndex,
          columnIndex,
          columnKey: columnConfig.key,
        })
      }
      onMouseEnter={
        !onMouseEnterCell
          ? undefined
          : (event) => {
              return onMouseEnterCell?.({
                event,
                rowIndex,
                columnIndex,
                record,
              });
            }
      }
    >
      <div className={clsx('am-virtual-table-cell-inner')}>{cellNode}</div>
    </div>
  );
}

// Each row is exactly getRowHeight tall and its cells stretch to fill it.
// Taller cell content spills into the cells' vertical padding instead of
// growing the row. Virtuoso measures the rows itself.
const renderTableRow = <RecordType extends object>(
  rowIndex: number,
  record: RecordType,
  context: IVirtualTableContext<RecordType>
) => (
  <div
    className="flex h-(--am-row-height)"
    style={
      {
        '--am-row-height': `${
          context.getRowHeight?.(record, rowIndex, context.rowList) ??
          ROW_HEIGHT
        }px`,
      } as React.CSSProperties
    }
  >
    {context.columns.map((column, columnIndex) => (
      <TableCell<RecordType>
        key={String(column.key ?? columnIndex)}
        columnIndex={columnIndex}
        rowIndex={rowIndex}
        record={record}
        context={context}
      />
    ))}
  </div>
);

export type HandleClickTableRow<T> = (ctx: {
  event: React.MouseEvent;
  record: T;
  rowIndex: number;
  columnIndex: number;
  columnKey: ColumnType<T>['key'];
}) => any;

export function VirtualTable<RecordType extends object>({
  markHoverRow,
  onClickRow,
  getRowHeight,
  getRowKey,
  getCellClassName,
  showScrollbar = true,
  emptyText = 'No Data',
  sortedInfo,
  overlayClassName,
  isDesktop,
  ...props
}: TableProps<RecordType> & {
  markHoverRow?: boolean;
  onClickRow?: HandleClickTableRow<RecordType>;
  /** Height of a row, ROW_HEIGHT by default */
  getRowHeight?: GetRowHeight<RecordType>;
  getRowKey?: (record: RecordType, rowIndex: number) => React.Key;
  getCellClassName?: IVirtualTableContext<RecordType>['getCellClassName'];
  showScrollbar?: boolean;
  emptyText?: string;
  sortedInfo?: SorterResult<RecordType>;
  overlayClassName?: string;
  isDesktop?: boolean;
}) {
  const { columns, scroll = { ...DEFAULT_SCROLL } } = props;
  const [tableWidth, setTableWidth] = useState(0);

  const widthColumnCount = useMemo(
    () => (columns || []).filter(({ width }) => !width).length,
    [columns]
  );
  const mergedColumns = useMemo(() => {
    return (columns || []).map((column) => {
      if (column.width) {
        if (isDesktop) {
          return {
            ...column,
            width: (Number(column.width) / 1160) * tableWidth,
          };
        }

        return column;
      }

      return {
        ...column,
        width: Math.floor(tableWidth / widthColumnCount),
      };
    });
  }, [columns, tableWidth, widthColumnCount, isDesktop]);

  const scrollerRef = useRef<HTMLElement | null>(null);
  // rc-table keeps the header's scrollLeft in sync through this object. It is
  // not the scroller element itself: given an element, rc-table would measure
  // its scrollbar and narrow the header's last column.
  const [connectObject] = useState(() => ({
    get scrollLeft() {
      return scrollerRef.current ? scrollerRef.current.scrollLeft : null;
    },
    set scrollLeft(scrollLeft: number | null) {
      if (scrollerRef.current && scrollLeft !== null) {
        scrollerRef.current.scrollLeft = scrollLeft;
      }
    },
  }));

  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const onLeaveTableBodyWrapper = useCallback(() => {
    if (!markHoverRow) return;
    setHoveredRowIndex(null);
  }, [markHoverRow]);

  const isLoading = useMemo(() => {
    return typeof props.loading === 'object'
      ? props.loading?.spinning
      : props.loading;
  }, [props.loading]);

  const totalHeight = useMemo(() => {
    const rows = props.dataSource || [];
    return rows.reduce(
      (sum, row, index) =>
        sum + (getRowHeight?.(row, index, rows) ?? ROW_HEIGHT),
      0
    );
  }, [getRowHeight, props.dataSource]);

  const { t } = useTranslation();

  const tableHeight = isDesktop
    ? Math.min(totalHeight, 556)
    : (scroll!.y as number);

  // When the rows overflow, the last column gives up the scrollbar's width so
  // the body still fits under the header.
  const columnWidths = mergedColumns.map((column, index) => {
    const width = column.width as number;
    return showScrollbar &&
      totalHeight > (scroll!.y as number) &&
      index === mergedColumns.length - 1
      ? width - SCROLLBAR_WIDTH - 1
      : width;
  });

  const renderVirtualList = (
    rowList: readonly RecordType[],
    { ref, onScroll }: any
  ) => {
    ref.current = connectObject;

    if (!rowList.length) {
      return (
        <TableBodyEmpty
          isLoading={isLoading}
          loadingText={t(
            'page.approvals.component.table.bodyEmpty.loadingText'
          )}
          emptyText={emptyText}
        />
      );
    }

    return (
      <Virtuoso<RecordType, IVirtualTableContext<RecordType>>
        scrollerRef={(element) => {
          scrollerRef.current = element as HTMLElement | null;
        }}
        className={clsx(
          'am-virtual-grid',
          markHoverRow && 'am-virtual-grid__supported-hover-row'
        )}
        style={{ height: tableHeight, width: tableWidth }}
        data={rowList}
        context={{
          columns: mergedColumns,
          columnWidths,
          rowList,
          getRowHeight,
          sortingKey: sortedInfo?.columnKey,
          onClickRow,
          hoveredRowIndex: !markHoverRow ? -1 : hoveredRowIndex,
          onMouseEnterCell: !markHoverRow
            ? undefined
            : (ctx) => {
                setHoveredRowIndex(ctx.rowIndex);
              },
          getCellClassName,
        }}
        computeItemKey={(rowIndex, record) =>
          getRowKey?.(record, rowIndex) ?? rowIndex
        }
        defaultItemHeight={ROW_HEIGHT}
        itemContent={renderTableRow}
        onScroll={(event) => {
          onScroll({ scrollLeft: event.currentTarget.scrollLeft });
        }}
      />
    );
  };

  const renderTableBody = useCallback(
    (...args: Parameters<typeof renderVirtualList>) => {
      if (!markHoverRow) return renderVirtualList(...args);

      return (
        <div
          className="am-table-vgrid-wrapper"
          onMouseLeave={onLeaveTableBodyWrapper}
        >
          {renderVirtualList(...args)}
        </div>
      );
    },
    [markHoverRow, onLeaveTableBodyWrapper, renderVirtualList]
  );

  const renderEmpty = useCallback(
    () => <TableBodyEmpty isLoading={isLoading} />,
    [isLoading]
  );

  const onResize = useRef(true);

  useLayoutEffect(() => {
    if (isDesktop) {
      const resize = () => {
        onResize.current = true;
      };
      window.addEventListener('resize', resize);
      return () => {
        window.removeEventListener('resize', resize);
      };
    }
  }, [isDesktop]);

  return (
    <ConfigProvider renderEmpty={renderEmpty}>
      <ResizeObserver
        onResize={({ width }) => {
          if (!isDesktop) {
            setTableWidth(width);
            return;
          }
          const forceResize = onResize.current;
          onResize.current = false;
          setTableWidth((e) => (e && !forceResize ? e : width));
        }}
      >
        <Table<RecordType>
          key={isDesktop ? tableWidth : undefined}
          {...props}
          className={
            overlayClassName
              ? overlayClassName
              : clsx(
                  'am-virtual-table',
                  isDesktop && 'is-desktop',
                  props.className
                )
          }
          columns={mergedColumns}
          pagination={false}
          showHeader={!!props?.dataSource?.length}
          components={{
            header: {
              cell: TableHeadCell,
            },
            body: !markHoverRow ? renderVirtualList : renderTableBody,
          }}
        />
      </ResizeObserver>
    </ConfigProvider>
  );
}
