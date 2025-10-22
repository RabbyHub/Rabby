import React, { memo } from 'react';

import { BookMark, Panel, ProxyTag, Value } from '../components';
import { PortfolioItem } from '@rabby-wallet/rabby-api/dist/types';

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
        {data.map((p: any) => {
          return (
            <Panel
              proposalTag={<BookMark content={tag} />}
              subTag={<ProxyTag item={data[0]} />}
            >
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
            </Panel>
          );
        })}
      </>
    );
  }
);
