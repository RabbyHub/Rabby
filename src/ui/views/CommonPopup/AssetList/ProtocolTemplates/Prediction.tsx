import React from 'react';

import Card from '../components/Card';
import PortfolioHeader from '../components/PortfolioHeader';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import { formatAmount, formatPrice, formatUsdValue } from '@/ui/utils/number';
import { useTranslation } from 'react-i18next';

export default React.memo(
  ({ name, data }: { name: string; data: AbstractPortfolio }) => {
    const portfolio = data._originPortfolio;
    const { t } = useTranslation();

    return (
      <Card>
        <PortfolioHeader data={data} name={name} showDescription />
        <div className="pl-4">
          <div className="text-12 font-medium text-r-neutral-title1">
            {portfolio?.detail?.name}
          </div>
          <div className="flex flex-col gap-12 mt-12">
            <div className="flex justify-between">
              <div className="flex-1 text-12 text-r-neutral-foot">
                {t('page.dashboard.assets.side')}
              </div>
              <div className="flex-1 text-12 text-r-neutral-foot">
                {t('page.dashboard.assets.amount')}
              </div>
              <div className="flex-1 text-12 text-r-neutral-foot">
                {t('page.dashboard.assets.price')}
              </div>
              <div className="flex-1 text-12 text-r-neutral-foot text-right">
                {t('page.dashboard.assets.usdValue')}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="flex-1 text-13 text-r-neutral-title1">
                {portfolio?.detail?.side}
              </div>
              <div className="flex-1 text-13 text-r-neutral-title1">
                {formatAmount(portfolio?.detail.amount ?? 0)}
              </div>
              <div className="flex-1 text-13 text-r-neutral-title1">
                ${formatPrice(portfolio?.detail.price ?? 0)}
              </div>
              <div className="flex-1 text-13 text-r-neutral-title1 text-right">
                {formatUsdValue(portfolio?.stats.net_usd_value ?? 0)}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }
);
