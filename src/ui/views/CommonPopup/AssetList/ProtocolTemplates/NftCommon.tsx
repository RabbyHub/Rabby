import React from 'react';

import Card from '../components/Card';
import PortfolioHeader from '../components/PortfolioHeader';
import { TokenList } from '../components/PortfolioDetail';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';

export default React.memo(
  ({ name, data }: { name: string; data: AbstractPortfolio }) => {
    const portfolio = data._originPortfolio;

    return (
      <Card>
        <PortfolioHeader data={data} name={name} showDescription />
        <TokenList
          tokens={portfolio?.detail?.supply_token_list}
          nfts={portfolio?.detail?.supply_nft_list}
          name="SUPPLIED"
        />
        <TokenList
          tokens={portfolio?.detail?.reward_token_list}
          name="REWARDS"
        />
      </Card>
    );
  }
);
