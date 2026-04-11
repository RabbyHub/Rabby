import React, { Fragment, memo, useMemo } from 'react';
import { Panel, ProxyTag, Table, Value } from '../components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';
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
            {data.map((p) => {
              const supply_token_list = p?.detail?.supply_token_list;
              const debt_token = p?.detail?.borrow_token_list;
              const showActionRow = hasActions(p);
              return (
                <Fragment key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}>
                  <Table.Row
                    key={`${p?.position_index}`}
                    className={
                      showActionRow ? 'border-b-0 px-16 pb-0' : 'px-16 py-[5px]'
                    }
                  >
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
                  {showActionRow && (
                    <ActionRow
                      className="px-16 pt-[0] pb-[17px] mt-[-6px]"
                      actionKeys={[
                        'default',
                        hasActions(p, 'withdraw') ? 'withdraw' : 'default',
                        hasReward
                          ? hasActions(p, 'claim')
                            ? 'claim'
                            : 'default'
                          : '',
                        'default',
                        'default',
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
