import React from 'react';
import Card from '../components/Card';
import PortfolioHeader from '../components/PortfolioHeader';
import { Supplements, TokenList } from '../components/PortfolioDetail';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';

export default React.memo(
  ({ name, data }: { name: string; data: AbstractPortfolio }) => {
    const portfolio = data._originPortfolio;

    const healthRate = portfolio.detail.health_rate;
    const supplements = [
      !!healthRate && {
        label: 'Health rate',
        content: healthRate <= 10 ? healthRate.toFixed(2) : '>10',
      },
    ];

    return (
      <Card>
        <PortfolioHeader data={data} name={name} showDescription />
        <Supplements data={supplements} />
        <TokenList
          tokens={portfolio?.detail?.supply_token_list}
          nfts={portfolio?.detail?.supply_nft_list}
          name="SUPPLIED"
        />
        <TokenList
          tokens={portfolio?.detail?.borrow_token_list}
          name="BORROWED"
        />
      </Card>
    );
  }
);
