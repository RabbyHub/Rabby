import { Table } from 'antd';
import { TableProps } from 'antd/lib/table';
import React from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  .ant-table-thead > tr > th {
    color: var(--rb-neutral-foot, #6a7587);
    font-size: 12px;
    font-weight: 500;
    background-color: transparent;
    border: none;

    /* padding: 12px 16px; */
    padding: 12px 8px;
  }

  .ant-table-tbody > tr > td {
    border-bottom: none;

    /* padding: 8px 16px; */
    padding: 8px;

    .is-long-bg {
      background: linear-gradient(to right, #58c66920, #58c66900);
      border-left: 2px solid var(--rb-green-default, #58c669);
    }
    .is-short-bg {
      background: linear-gradient(to right, #ff453a20, #ff453a00);
      border-left: 2px solid var(--rb-red-default, #ff453a);
    }
  }
`;

export const CommonTable = <T extends object = any>(props: TableProps<T>) => {
  return (
    <Wrapper>
      <Table {...props}></Table>
    </Wrapper>
  );
};
