import React, { Fragment, memo } from 'react';

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
    protocolName?: string;
  }) => {
    const { tag, protocolLogo, protocolName } = props;
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
              const showActionRow = hasActions(p);
              return (
                <Fragment key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}>
                  <Table.Row
                    className={
                      showActionRow ? 'border-b-0 px-16 pb-0' : 'px-16 py-[5px]'
                    }
                  >
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
                  {showActionRow && (
                    <ActionRow
                      className="px-16 pt-[0] pb-[17px] mt-[-6px]"
                      actionKeys={[
                        'default',
                        'default',
                        hasActions(p, 'withdraw') ? 'withdraw' : 'default',
                        hasRewardTokenList
                          ? hasActions(p, 'claim')
                            ? 'claim'
                            : 'default'
                          : '',
                        has_expired_at ? 'default' : '',
                        'default',
                      ]}
                      portfolio={p}
                      protocolLogo={protocolLogo || ''}
                      protocolName={protocolName}
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
