import React, { memo } from 'react';

import { BookMark, Panel, ProxyTag, Value } from '../components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';
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

    return (
      <>
        {data.map((p) => {
          const showActionRow = hasActions(p);
          return (
            <Panel
              key={`${p?.position_index}-${p?.pool?.id}-${p.name}`}
              proposalTag={<BookMark content={tag} />}
              subTag={<ProxyTag item={data[0]} />}
            >
              <div>
                <Value.NFTTable
                  name="Supplied"
                  tokens={p?.detail?.supply_nft_list}
                />
                <Value.TokenTable
                  name="Borrowed"
                  tokens={p?.detail?.borrow_token_list}
                />
                <Value.TokenTable
                  name="Rewards"
                  tokens={p?.detail?.reward_token_list}
                />
              </div>
              {showActionRow && (
                <ActionRow
                  className="px-16 pt-[0] pb-[17px]"
                  actionKeys={[
                    hasActions(p, 'withdraw') ? 'withdraw' : 'default',
                    'default',
                    hasActions(p, 'claim') ? 'claim' : 'default',
                  ]}
                  portfolio={p}
                  protocolLogo={protocolLogo || ''}
                />
              )}
            </Panel>
          );
        })}
      </>
    );
  }
);
