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
    const headers = ['Pool', 'Balance'];

    const hasDescription = data.some(
      (v) => v?.detail?.description !== undefined
    );
    const hasRewardTokenList = data.some(
      (v) => v?.detail?.reward_token_list !== undefined
    );
    const hasBorrowTokenList = data.some(
      (v) => v?.detail?.borrow_token_list !== undefined
    );

    if (hasRewardTokenList) headers.push('Rewards');
    if (hasDescription) headers.unshift('');
    if (hasBorrowTokenList) headers.push('Borrow');

    headers.push('USD Value');

    return (
      <Panel tag={tag} subTag={<ProxyTag item={data[0]} />}>
        <Table>
          <Table.Header className="mt-[9px]" headers={headers} />
          <Table.Body>
            {data.map((p, index: number) => {
              return (
                <Table.Row key={`${p?.name}_${index}`}>
                  {hasDescription && (
                    <Value.String value={p?.detail?.description} />
                  )}
                  <Value.Tokens value={p?.detail?.supply_token_list || []} />
                  <Value.Balances
                    value={p?.detail?.supply_token_list || []}
                    portfolio={p}
                  />
                  {hasRewardTokenList && (
                    <Value.ClaimableTokens
                      portfolio={p}
                      value={
                        (Array.isArray(p?.detail?.reward_token_list)
                          ? p?.detail?.reward_token_list || []
                          : [p?.detail?.reward_token_list]
                        ).filter(Boolean) as PortfolioItemToken[]
                      }
                    />
                  )}
                  {hasBorrowTokenList && (
                    <Value.ClaimableTokens
                      value={
                        (Array.isArray(p?.detail?.borrow_token_list)
                          ? p?.detail?.borrow_token_list || []
                          : [p?.detail?.borrow_token_list]
                        ).filter(Boolean) as PortfolioItemToken[]
                      }
                    />
                  )}
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
