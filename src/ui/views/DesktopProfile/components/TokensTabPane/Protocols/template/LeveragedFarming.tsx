import React, { memo, useMemo } from 'react';
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

    const hasReward = useMemo(
      () => data?.some((x) => x.detail?.reward_token_list?.length),
      [data]
    );

    const headers = useMemo(() => {
      const _headers = ['Pool', 'Supply', 'Borrow', 'Debt Ratio', 'USD Value'];

      if (hasReward) {
        _headers.splice(2, 0, 'Rewards');
      }

      return _headers;
    }, [hasReward]);

    return (
      <Panel tag={tag} subTag={<ProxyTag item={data[0]} />}>
        <Table>
          <Table.Header headers={headers} />
          <Table.Body>
            {data.map((p, index: number) => {
              const supply_token_list = p?.detail?.supply_token_list;
              const debt_token = p?.detail?.borrow_token_list;
              return (
                <Table.Row key={`${p?.name}_${index}`}>
                  <Value.Tokens value={supply_token_list || []} />
                  <Value.Balances value={supply_token_list || []} />
                  {hasReward ? (
                    <Value.Balances
                      value={p?.detail?.reward_token_list || []}
                    />
                  ) : null}
                  <Value.Balances value={debt_token || []} />
                  <Value.Percent value={p?.detail?.debt_ratio} />
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
