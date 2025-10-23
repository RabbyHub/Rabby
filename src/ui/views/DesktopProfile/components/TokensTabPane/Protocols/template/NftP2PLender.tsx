import React, { memo } from 'react';
import styled from 'styled-components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

import { BookMark, Panel, ProxyTag, Value } from '../components';

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
  }) => {
    const { tag } = props;
    const data = props.data;

    return (
      <>
        {data.map((p) => {
          return (
            <Panel
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
            </Panel>
          );
        })}
      </>
    );
  }
);
