import React, { Fragment, memo } from 'react';

import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

import { Panel, ProxyTag, Table, Value } from '../components';
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

    const has_daily_unlock_amount = data.some(
      (v) => v?.detail?.daily_unlock_amount !== undefined
    );
    const has_end_at = data.some((v) => v?.detail?.end_at !== undefined);
    const hasClaimableAmount = data.some(
      (v) => typeof v?.detail?.token?.claimable_amount !== 'undefined'
    );

    if (hasClaimableAmount) headers.push('Claimable Amount');
    if (has_daily_unlock_amount) headers.push('Daily Unlock Amount');
    if (has_end_at) headers.push('End Time');

    headers.push('USD Value');

    return (
      <Panel tag={tag} subTag={<ProxyTag item={data[0]} />}>
        <Table>
          <Table.Header headers={headers} />
          <Table.Body>
            {data.map((p, index: number) => {
              const showActionRow = hasActions(p);
              return (
                <Fragment key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}>
                  <Table.Row
                    key={index}
                    className={
                      showActionRow ? 'border-b-0 px-16 pb-0' : 'px-16 py-[5px]'
                    }
                  >
                    <Value.Token value={p?.detail?.token} />
                    <Value.Balance value={p?.detail?.token} />
                    {hasClaimableAmount && (
                      <Value.NumberWithCommas
                        value={p?.detail?.token?.claimable_amount}
                      />
                    )}
                    {has_daily_unlock_amount && (
                      <Value.NumberWithCommas
                        value={p?.detail?.daily_unlock_amount}
                      />
                    )}
                    {has_end_at && <Value.Time value={p?.detail?.end_at} />}
                    <Value.USDValue value={p?.stats?.net_usd_value} />
                  </Table.Row>
                  {showActionRow && (
                    <ActionRow
                      className="px-16 pt-[0] pb-[17px]"
                      actionKeys={[
                        'default',
                        hasActions(p, 'withdraw') ? 'withdraw' : 'default',
                        hasClaimableAmount
                          ? hasActions(p, 'claim')
                            ? 'claim'
                            : 'default'
                          : '',
                        has_daily_unlock_amount ? 'default' : '',
                        has_end_at ? 'default' : '',
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
