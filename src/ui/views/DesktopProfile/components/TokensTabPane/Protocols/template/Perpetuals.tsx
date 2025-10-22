import React, { memo, useMemo } from 'react';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

import { BookMark, Panel, ProxyTag, Table, Value } from '../components';

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
  }) => {
    const { tag } = props;
    const data: any = props.data;

    const hasDescription = useMemo(
      () => data.some((v: any) => v?.detail?.description !== undefined),
      [data]
    );

    const headers = useMemo(() => {
      const heads = [
        'Currency Pair',
        'Side',
        'Leverage',
        'Margin',
        'P&L',
        'USD Value',
      ];
      if (hasDescription) heads.unshift('');

      return heads;
    }, [hasDescription]);

    return data.map((p: any) => (
      <Panel
        proposalTag={<BookMark content={tag} />}
        subTag={<ProxyTag item={data[0]} />}
      >
        <Table>
          <Table.Header headers={headers} />
          <Table.Body>
            <Table.Row>
              {hasDescription && (
                <Value.String value={p?.detail?.description} />
              )}
              <Value.TokensSlash
                value={[p.detail.base_token, p.detail.quote_token]}
              />
              <Value.String value={p.detail.side} />
              <Value.String value={p.detail.leverage.toFixed(2) + 'x'} />
              <Value.Balance value={p.detail.margin_token} />
              <Value.USDValue value={p.detail.pnl_usd_value || 0} />
              <Value.USDValue value={p.stats.net_usd_value} />
            </Table.Row>
          </Table.Body>
        </Table>
      </Panel>
    ));
  }
);
