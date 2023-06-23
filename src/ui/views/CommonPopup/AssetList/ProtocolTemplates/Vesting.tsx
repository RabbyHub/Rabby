import React from 'react';
import dayjs from 'dayjs';

import Card from '../components/Card';
import { formatTokenAmount } from 'ui/utils/number';
import PortfolioHeader from '../components/PortfolioHeader';
import { TokenList, Supplements } from '../components/PortfolioDetail';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';

export default React.memo(
  ({ name, data }: { name: string; data: AbstractPortfolio }) => {
    const portfolio = data._originPortfolio;

    const claimableAmount = portfolio.detail.token?.claimable_amount;
    const dailyUnlockAmount = portfolio.detail.daily_unlock_amount;
    const endAt = portfolio.detail.end_at;

    const supplements = [
      !!claimableAmount && {
        label: 'Claimable',
        content: formatTokenAmount(claimableAmount),
      },
      !!endAt && {
        label: 'End at',
        content: dayjs(Number(endAt) * 1000).format('YYYY/MM/DD'),
      },
      !!dailyUnlockAmount && {
        label: 'Daily unlock',
        content: formatTokenAmount(dailyUnlockAmount),
      },
    ];

    return (
      <Card>
        <PortfolioHeader data={data} name={name} showDescription />
        <Supplements data={supplements} />
        <TokenList
          tokens={portfolio.detail.token ? [portfolio.detail.token] : []}
          name="POOL"
        />
      </Card>
    );
  }
);
