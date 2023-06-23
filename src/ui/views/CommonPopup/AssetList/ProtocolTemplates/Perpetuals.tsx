import React from 'react';
import Card from '../components/Card';
import { getTokenSymbol } from 'ui/utils/token';
import { formatUsdValue } from 'ui/utils/number';
import PortfolioHeader from '../components/PortfolioHeader';
import { TokenList, Supplements } from '../components/PortfolioDetail';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';

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

    const supplements = [
      !!tradePair && {
        label: 'Trade pair',
        content: tradePair,
      },
      !!side && {
        label: 'Side',
        content: side,
      },
      !!leverage && {
        label: 'Leverage',
        content: `${leverage.toFixed(2)}x`,
      },
      !!pnl && {
        label: 'P&L',
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
