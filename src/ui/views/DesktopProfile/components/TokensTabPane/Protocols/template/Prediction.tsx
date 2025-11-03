import React, { memo } from 'react';

import { Panel, ProxyTag, Table, Value } from '../components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';
import { formatAmount, formatPrice } from '@/ui/utils/number';

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
    protocolLogo?: string;
  }) => {
    const { tag } = props;
    const data = props.data;
    const headers = ['Name', 'Side', 'Amount', 'Price', 'USD Value'];
    return (
      <>
        {data.map((p) => (
          <Panel
            key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}
            tag={tag}
            subTag={<ProxyTag item={data[0]} />}
          >
            <Table widths={[360]}>
              <Table.Header headers={headers} />
              <Table.Body>
                <Table.Row className="px-16 py-[5px]">
                  <Value.String value={p?.detail?.name} />
                  <Value.String value={p?.detail?.side} />
                  <Value.String value={formatAmount(p?.detail?.amount || 0)} />
                  <Value.String value={formatPrice(p?.detail?.price || 0)} />
                  <Value.USDValue value={p?.stats?.net_usd_value} />
                </Table.Row>
              </Table.Body>
            </Table>
          </Panel>
        ))}
      </>
    );
  }
);
