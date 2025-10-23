import React, { memo } from 'react';

import {
  PortfolioItem,
  PortfolioItemToken,
} from '@rabby-wallet/rabby-api/dist/types';

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
    const headers = ['Pool', 'Balance'];

    const hasDescription = data.some(
      (v) => v?.detail?.description !== undefined
    );
    const hasRewardTokenList = data.some(
      (v) => v?.detail?.reward_token_list !== undefined
    );
    const hasunlock_at = data.some((v) => v?.detail?.unlock_at !== undefined);
    if (hasRewardTokenList) headers.push('Rewards');
    if (hasDescription) headers.unshift('');
    if (hasunlock_at) headers.push('Unlock time');
    headers.push('USD Value');

    return (
      <Panel tag={tag} subTag={<ProxyTag item={data[0]} />}>
        <Table>
          <Table.Header headers={headers} />
          <Table.Body>
            {data.map((p, index: number) => {
              return (
                <Table.Row key={`${p?.name}_${index}`}>
                  {hasDescription && (
                    <Value.String value={p?.detail?.description} />
                  )}
                  <Value.Tokens value={p?.detail?.supply_token_list || []} />
                  <Value.Balances value={p?.detail?.supply_token_list || []} />
                  {hasRewardTokenList && (
                    <Value.ClaimableTokens
                      value={
                        (Array.isArray(p?.detail?.reward_token_list)
                          ? p?.detail?.reward_token_list || []
                          : [p?.detail?.reward_token_list]
                        ).filter(Boolean) as PortfolioItemToken[]
                      }
                    />
                  )}
                  {hasunlock_at && <Value.Time value={p?.detail?.unlock_at} />}
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
