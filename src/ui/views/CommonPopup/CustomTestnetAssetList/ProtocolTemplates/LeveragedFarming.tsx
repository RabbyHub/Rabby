import React from 'react';
import Card from '../components/Card';
import PortfolioHeader from '../components/PortfolioHeader';
import { TokenList, Supplements } from '../components/PortfolioDetail';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import { useTranslation } from 'react-i18next';

export default React.memo(
  ({ name, data }: { name: string; data: AbstractPortfolio }) => {
    const portfolio = data._originPortfolio;
    const { t } = useTranslation();
    const debtRatio = portfolio.detail.debt_ratio;
    const supplements = [
      !!debtRatio && {
        label: t('page.dashboard.assets.table.debtRatio'),
        content: debtRatio.toFixed(2),
      },
    ];

    return (
      <Card>
        <PortfolioHeader data={data} name={name} showDescription />
        <Supplements data={supplements} />
        <TokenList
          tokens={portfolio.detail.supply_token_list}
          name="SUPPLIED"
        />
        <TokenList tokens={portfolio.detail.reward_token_list} name="REWARDS" />
        <TokenList
          tokens={portfolio.detail.borrow_token_list}
          name="BORROWED"
        />
      </Card>
    );
  }
);
