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
          fraction={{
            collection: portfolio.detail.collection!,
            value: portfolio.stats.net_usd_value,
            shareToken: portfolio.detail.share_token!,
          }}
          name="COLLECTION"
        />
      </Card>
    );
  }
);
