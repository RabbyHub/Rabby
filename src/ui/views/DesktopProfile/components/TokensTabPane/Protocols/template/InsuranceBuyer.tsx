import React, { memo } from 'react';

import { Panel, ProxyTag, Table, Value } from '../components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
  }) => {
    const { tag } = props;
    const data = props.data;
    const headers = ['Description'];

    const has_expired_at = data.some(
      (v) => v?.detail?.expired_at !== undefined
    );

    if (has_expired_at) headers.push('Expired Time');

    headers.push('USD Value');

    return (
      <Panel tag={tag} subTag={<ProxyTag item={data[0]} />}>
        <Table>
          <Table.Header headers={headers} />
          <Table.Body>
            {data.map((p) => {
              return (
                <Table.Row
                  key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}
                >
                  <Value.String value={p?.detail?.description} />
                  {has_expired_at && (
                    <Value.Time value={p?.detail?.expired_at} />
                  )}
                  <Value.USDValue value={p?.detail?.usd_value ?? '-'} />
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </Panel>
    );
  }
);
