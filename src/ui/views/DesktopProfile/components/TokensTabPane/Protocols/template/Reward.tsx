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

    const headers = ['Pool', 'Balance', 'USD Value'];
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
                    <Value.Tokens value={p?.detail?.token_list || []} />
                    <Value.Balances value={p?.detail?.token_list || []} />
                    <Value.USDValue value={p?.stats?.net_usd_value} />
                  </Table.Row>
                  {showActionRow && (
                    <ActionRow
                      className="px-16 pt-[0] pb-[17px]"
                      actionKeys={[
                        'default',
                        hasActions(p, 'withdraw') ? 'withdraw' : 'default',
                        hasActions(p, 'claim') ? 'claim' : 'default',
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
