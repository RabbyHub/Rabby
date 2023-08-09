import React from 'react';
import Card from '../components/Card';
import { getTokenSymbol } from 'ui/utils/token';
import { formatUsdValue } from 'ui/utils/number';
import PortfolioHeader from '../components/PortfolioHeader';
import { TokenList, Supplements } from '../components/PortfolioDetail';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import { useTranslation } from 'react-i18next';

export default React.memo(
  ({ name, data }: { name: string; data: AbstractPortfolio }) => {
    const portfolio = data._originPortfolio;

    const tradePair =
      getTokenSymbol(portfolio.detail.base_token) +
      '/' +
      getTokenSymbol(portfolio.detail.quote_token);
    const side = portfolio.detail.side;
    const leverage = portfolio.detail.leverage;
    const pnl = portfolio.detail.pnl_usd_value;
    const { t } = useTranslation();

    const supplements = [
      !!tradePair && {
        label: t('page.dashboard.assets.table.tradePair'),
        content: tradePair,
      },
      !!side && {
        label: t('page.dashboard.assets.table.side'),
        content: side,
      },
      !!leverage && {
        label: t('page.dashboard.assets.table.leverage'),
        content: `${leverage.toFixed(2)}x`,
      },
      !!pnl && {
        label: t('page.dashboard.assets.table.PL'),
        content: (
          <span style={{ color: pnl < 0 ? 'red' : 'green' }}>{`${
            pnl > 0 ? '+' : ''
          }${formatUsdValue(pnl)}`}</span>
        ),
      },
    ];

    return (
      <Card>
        <PortfolioHeader data={data} name={name} showDescription />
        <Supplements data={supplements} />
        <TokenList
          tokens={
            portfolio.detail.position_token
              ? [portfolio.detail.position_token]
              : []
          }
          name="POSITION"
        />
        <TokenList
          tokens={
            portfolio.detail.margin_token ? [portfolio.detail.margin_token] : []
          }
          name="MARGIN"
        />
      </Card>
    );
  }
);
