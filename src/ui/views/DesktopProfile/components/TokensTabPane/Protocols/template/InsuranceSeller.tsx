import React, { memo } from 'react';

import { Panel, ProxyTag, Table, Value } from '../components';
import {
  PortfolioItem,
  PortfolioItemToken,
} from '@rabby-wallet/rabby-api/dist/types';

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
  }) => {
    const { tag } = props;
    const data = props.data;
    const headers = ['Description', 'Collateral', 'Balance'];
    const hasRewardTokenList = data.some(
      (v) => v?.detail?.reward_token_list !== undefined
    );
    const has_expired_at = data.some(
      (v) => v?.detail?.expired_at !== undefined
    );

    if (hasRewardTokenList) headers.push('Rewards');
    if (has_expired_at) headers.push('Expired Time');

    headers.push('USD Value');

    return (
      <Panel tag={tag} subTag={<ProxyTag item={data[0]} />}>
        <Table>
          <Table.Header headers={headers} />
          <Table.Body>
            {data.map((p) => {
              return (
                <Table.Row>
                  <Value.String value={p?.detail?.description} />
                  <Value.Tokens
                    value={p?.detail?.collateral_token_list || []}
                  />
                  <Value.Balances
                    value={p?.detail?.collateral_token_list || []}
                  />
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
