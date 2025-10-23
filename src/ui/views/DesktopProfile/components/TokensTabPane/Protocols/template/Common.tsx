import React, { memo, Fragment } from 'react';

import { Panel, ProxyTag, Table, Value } from '../components';
import {
  PortfolioItem,
  PortfolioItemToken,
} from '@rabby-wallet/rabby-api/dist/types';
import { ActionRow, hasActions } from '../components/ActionRow';

export default memo(
  (props: {
    tag: string;
    data: PortfolioItem[];
    name: string;
    siteUrl?: string;
    protocolLogo?: string;
  }) => {
    const { tag, protocolLogo } = props;
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
            {data.map((p) => {
              const showActionRow = hasActions(p);
              return (
                <Fragment key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}>
                  <Table.Row
                    key={`${p?.position_index}`}
                    className={
                      showActionRow ? 'border-b-0 px-16 pb-0' : 'px-16 py-[5px]'
                    }
                  >
                    {hasDescription && (
                      <Value.String value={p?.detail?.description} />
                    )}
                    <Value.Tokens value={p?.detail?.supply_token_list || []} />
                    <Value.Balances
                      value={p?.detail?.supply_token_list || []}
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
                  {showActionRow && (
                    <ActionRow
                      className="px-16 pt-[0] pb-[17px] mt-[-6px]"
                      actionKeys={[
                        hasDescription ? 'default' : '',
                        'default',
                        hasActions(p, 'withdraw') ? 'withdraw' : 'default',
                        hasRewardTokenList
                          ? hasActions(p, 'claim')
                            ? 'claim'
                            : 'default'
                          : '',
                        hasBorrowTokenList ? 'default' : '',
                        'default',
                      ]}
                      portfolio={p}
                      protocolLogo={protocolLogo || ''}
                    />
                  )}
                </Fragment>
              );
            })}
          </Table.Body>
        </Table>
      </Panel>
    );
  }
);
