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
            </Panel>
          );
        })}
      </>
    );
  }
);
