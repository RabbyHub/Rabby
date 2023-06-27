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
        <TokenList nfts={portfolio?.detail?.supply_nft_list} name="SUPPLIED" />
        <TokenList
          tokens={portfolio?.detail?.borrow_token_list}
          name="BORROWED"
        />
        <TokenList
          tokens={portfolio?.detail?.reward_token_list}
          name="REWARDS"
        />
      </Card>
    );
  }
);
