import React, { memo } from 'react';

import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

import { Panel, ProxyTag, Table, Value } from '../components';

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
  }) => {
    const { tag } = props;
    const data = props.data;

    const headers = ['Pool', 'Balance', 'USD Value'];
    return (
      <Panel tag={tag} subTag={<ProxyTag item={data[0]} />}>
        <Table>
          <Table.Header headers={headers} />
          <Table.Body>
            {data.map((p: any) => {
              return (
                <Table.Row>
                  <Value.Tokens value={p?.detail?.token_list} />
                  <Value.Balances value={p?.detail?.token_list} />
                  <Value.USDValue value={p?.stats?.net_usd_value} />
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </Panel>
    );
  }
);
