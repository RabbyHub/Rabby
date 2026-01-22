import { Table } from 'antd';
import { TableProps, ColumnType } from 'antd/lib/table';
import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { ReactComponent as RcIconEmpty } from '@/ui/assets/perps/IconHistoryEmpty.svg';

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

  .ant-table-header {
    flex-shrink: 0;
    .ant-table-thead > tr > th.ant-table-cell-scrollbar:last-child {
      padding-right: 0;
      display: none;
    }

    .ant-table-thead > tr > th:nth-last-child(2) {
      padding-right: 20px; // add 4px for scrollbar
    }
  }

  .ant-table-body {
    flex: 1;
    overflow-y: auto !important;
    overflow-x: hidden !important;
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

interface CommonTableProps<T> extends TableProps<T> {
  columns: ColumnType<T>[];
  dataSource: T[];
  defaultSortField?: string;
  defaultSortOrder?: 'ascend' | 'descend';
  emptyMessage?: string;
  scrollHeight?: number | string;
}

export const CommonTable = <T extends object = any>({
  columns,
  onChange,
  dataSource,
  defaultSortField,
  defaultSortOrder = 'ascend',
  emptyMessage,
  scrollHeight,
  ...restProps
}: CommonTableProps<T>) => {
  const [sortedInfo, setSortedInfo] = useState<{
    field: string | null;
    order: 'ascend' | 'descend' | null;
  }>({
    field: defaultSortField || null,
    order: defaultSortField ? defaultSortOrder : null,
  });

  const handleTableChange = (
    pagination: any,
    filters: any,
    sorter: any,
    extra: any
  ) => {
    const clickedField = sorter.field;
    const clickedOrder = sorter.order;

    // If clicking the same column, toggle between ascend and descend
    if (clickedField === sortedInfo.field) {
      const newOrder = sortedInfo.order === 'ascend' ? 'descend' : 'ascend';
      setSortedInfo({
        field: clickedField,
        order: newOrder,
      });

      // Override sorter.order for onChange callback
      sorter.order = newOrder;
    } else {
      // Clicking a different column, use ascending order by default
      setSortedInfo({
        field: clickedField || null,
        order: clickedField ? 'ascend' : null,
      });

      // Override sorter.order for onChange callback
      if (clickedField) {
        sorter.order = 'ascend';
      }
    }

    // Call parent onChange if provided
    onChange?.(pagination, filters, sorter, extra);
  };

  const enhancedColumns = useMemo(() => {
    return columns.map((col) => {
      // Only enhance columns with sorter
      if (!col.sorter) {
        return col;
      }

      const originalTitle = col.title;
      const fieldKey = col.key || col.dataIndex;

      return {
        ...col,
        sortOrder: sortedInfo.field === fieldKey ? sortedInfo.order : null,
        sortDirections: ['ascend', 'descend', 'ascend'] as any,
        title: (
          <>
            {originalTitle}
            {sortedInfo.field === fieldKey && sortedInfo.order && (
              <span className="ml-[4px]">
                {sortedInfo.order === 'ascend' ? '↑' : '↓'}
              </span>
            )}
          </>
        ),
      };
    });
  }, [columns, sortedInfo]);

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

  return (
    <Wrapper>
      <Table
        {...restProps}
        dataSource={dataSource}
        columns={enhancedColumns}
        onChange={handleTableChange}
        scroll={{ y: scrollHeight || 'auto' }}
      />
    </Wrapper>
  );
};
