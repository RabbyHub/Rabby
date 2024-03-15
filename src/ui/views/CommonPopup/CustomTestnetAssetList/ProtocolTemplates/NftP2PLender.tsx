import React from 'react';
import Card from '../components/Card';
import PortfolioHeader from '../components/PortfolioHeader';
import { TokenList } from '../components/PortfolioDetail';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import { useTranslation } from 'react-i18next';

export default React.memo(
  ({ name, data }: { name: string; data: AbstractPortfolio }) => {
    const portfolio = data._originPortfolio;
    const { t } = useTranslation();

    return (
      <Card>
        <PortfolioHeader data={data} name={name} showDescription />
        <TokenList
          nfts={portfolio?.detail?.nft_list}
          name={t('page.dashboard.assets.table.lentAgainst')}
        />
        <TokenList
          tokens={portfolio?.detail?.supply_token_list}
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
