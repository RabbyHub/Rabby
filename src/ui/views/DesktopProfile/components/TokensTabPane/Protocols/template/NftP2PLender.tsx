import React, { memo } from 'react';
import styled from 'styled-components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

import { BookMark, Panel, ProxyTag, Value } from '../components';
import { ActionRow, hasActions } from '../components/ActionRow';

export const LineCard = styled.div`
  > div {
    border-bottom: 0.5px solid var(--r-neutral-line);
  }

  > div:last-child {
    border-bottom: none;
  }
`;

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
              <LineCard>
                <Value.NFTTable
                  name="Lent against"
                  tokens={p?.detail?.nft_list}
                />
                <Value.TokenTable
                  name="Supplied"
                  tokens={p?.detail?.supply_token_list}
                />
                <Value.TokenTable
                  name="Rewards"
                  tokens={p?.detail?.reward_token_list}
                />
              </LineCard>
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
            </Panel>
          );
        })}
      </>
    );
  }
);
