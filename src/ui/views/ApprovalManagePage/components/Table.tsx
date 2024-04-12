import React, {
  useMemo,
  useEffect,
  useCallback,
  useRef,
  useState,
} from 'react';
import { ConfigProvider, Empty, Table } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnGroupType, ColumnType } from 'antd/lib/table';

import classNames from 'classnames';
import clsx from 'clsx';
import ResizeObserver from 'rc-resize-observer';
import { VariableSizeGrid as VGrid, areEqual } from 'react-window';
import { ROW_HEIGHT, SCROLLBAR_WIDTH } from '../constant';

import { ReactComponent as RcIconNoMatchCC } from '../icons/no-match-cc.svg';
import { SorterResult } from 'antd/lib/table/interface';
import { useTranslation } from 'react-i18next';

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
      className={classNames('am-virtual-table-head-cell', props.className)}
    >
      {children}
    </th>
  );
}

type IVGridItemDataType<RecordType> = {
  columns: (ColumnGroupType<RecordType> | ColumnType<RecordType>)[];
  rowList: readonly RecordType[];
  sortingKey?: SorterResult<RecordType>['columnKey'];
  hoveredRowIndex?: number | null;
  onClickRow?: HandleClickTableRow<RecordType>;
  onMouseEnterCell?: (
    ctx: IVGridContextualPayload<RecordType> & {
      event: React.MouseEvent<HTMLDivElement>;
    }
  ) => void;
  getCellClassName?: (
    ctx: IVGridContextualPayload<RecordType>
  ) => string | undefined;
};

export type IVGridContextualPayload<RecordType> = {
  columnIndex: number;
  rowIndex: number;
  record: RecordType;
};

const TableCellProto = <RecordType extends object = any>({
  columnIndex,
  rowIndex,
  style,
  data,
}: {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: IVGridItemDataType<RecordType>;
}) => {
  const {
    rowList,
    columns,
    getCellClassName,
    onClickRow,
    hoveredRowIndex,
    onMouseEnterCell,
    sortingKey,
  } = data;

  const record = rowList[rowIndex];
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

  const colGroupConfig = columnConfig as ColumnGroupType<RecordType>;
  if (typeof colGroupConfig.render === 'function') {
    cellNode = colGroupConfig.render!(cellValue, record, rowIndex) || null;
  }

  return (
    <div
      // pointless, see itemKey property of VGrid
      key={`r-${rowIndex}-c-${columnIndex}-${columnConfig.key}`}
      className={classNames(
        'am-virtual-table-cell',
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
      <div className={classNames('am-virtual-table-cell-inner')}>
        {cellNode}
      </div>
    </div>
  );
};
const TableCellRenderer = React.memo(
  TableCellProto,
  areEqual
) as typeof TableCellProto;

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
  getCellClassName,
  showScrollbar = true,
  emptyText = 'No Data',
  sortedInfo,
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
  getCellKey?: (params: IVGridContextualPayload<RecordType>) => string | number;
  getCellClassName?: IVGridItemDataType<RecordType>['getCellClassName'];
  showScrollbar?: boolean;
  emptyText?: string;
  sortedInfo?: SorterResult<RecordType>;
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

  const resetVirtualGrid = useCallback(() => {
    gridRef.current?.resetAfterIndices({
      columnIndex: 0,
      rowIndex: 0,
      shouldForceUpdate: true,
    });
  }, []);

  useEffect(() => {
    resetVirtualGrid();
  }, [tableWidth]);

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
    return (
      getTotalHeight?.(props.dataSource || []) ||
      (props.dataSource?.length ?? 0) * ROW_HEIGHT
    );
  }, [getTotalHeight, props.dataSource]);

  const { t } = useTranslation();

  const renderVirtualList = (
    rowList: readonly RecordType[],
    { scrollbarSize, ref, onScroll }: any
  ) => {
    ref.current = connectObject;
    // const totalHeight = rowList.length * ROW_HEIGHT;

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
      <VGrid<IVGridItemDataType<RecordType>>
        ref={gridRef}
        className={clsx(
          'am-virtual-grid',
          markHoverRow && 'am-virtual-grid__supported-hover-row'
        )}
        itemKey={(params) => {
          const keyStr = getCellKey?.({
            rowIndex: params.rowIndex,
            columnIndex: params.columnIndex,
            record: params.data.rowList[params.rowIndex],
          });
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
        rowCount={rowList.length}
        rowHeight={(rowIndex: number) => {
          return (
            getRowHeight?.(rowList[rowIndex], rowIndex, rowList) ?? ROW_HEIGHT
          );
        }}
        itemData={{
          columns: mergedColumns,
          rowList,
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
        height={scroll!.y as number}
        width={tableWidth}
        onScroll={({ scrollLeft }: { scrollLeft: number }) => {
          onScroll({ scrollLeft });
        }}
      >
        {TableCellRenderer}
      </VGrid>
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

  // // leave here for debug unexpected re-render
  // useEffect(() => {
  //   if (!appIsProd) return ;
  //   console.log('VirtualTable mounted');

  //   return () => {
  //     console.log('VirtualTable unmounted');
  //   };
  // }, []);

  return (
    <ConfigProvider renderEmpty={renderEmpty}>
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
            body: !markHoverRow ? renderVirtualList : renderTableBody,
          }}
        />
      </ResizeObserver>
    </ConfigProvider>
  );
}
