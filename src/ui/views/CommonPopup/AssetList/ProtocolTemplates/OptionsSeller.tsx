import React from 'react';
import dayjs from 'dayjs';

import Card from '../components/Card';
import { formatPrice } from 'ui/utils/number';
import { getTokenSymbol } from 'ui/utils/token';

import { TokenList, Supplements } from '../components/PortfolioDetail';
import PortfolioHeader from '../components/PortfolioHeader';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';

export default React.memo(
  ({ name, data }: { name: string; data: AbstractPortfolio }) => {
    const portfolio = data._originPortfolio;

    const optionsType = portfolio.detail.type;
    const strikePrice = portfolio.detail.underlying_token?.amount
      ? formatPrice(
          (portfolio.detail.strike_token?.amount || 0) /
            portfolio.detail.underlying_token?.amount
        )
      : '';
    const exerciseEnd = portfolio.detail.exercise_end_at;

    const supplements = [
      !!optionsType && {
        label: 'Type',
        content: optionsType,
      },
      !!strikePrice && {
        label: 'Strike price',
        content:
          strikePrice + ' ' + getTokenSymbol(portfolio.detail.strike_token),
      },
      !!exerciseEnd && {
        label: 'Exercise end',
        content: dayjs(Number(exerciseEnd) * 1000).format('YYYY/MM/DD'),
      },
    ];

    return (
      <Card>
        <PortfolioHeader data={data} name={name} showDescription />
        <Supplements data={supplements} />
        <TokenList
          tokens={
            portfolio.detail.underlying_token
              ? [portfolio.detail.underlying_token]
              : []
          }
          name="UNDERLYING"
        />
        <TokenList
          tokens={portfolio.detail.collateral_token_list}
          name="COLLATERAL"
        />
      </Card>
    );
  }
);
