import React from 'react';
import Card from '../components/Card';

import PortfolioHeader from '../components/PortfolioHeader';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import { useTranslation } from 'react-i18next';

export default React.memo(
  ({ name, data }: { name: string; data: AbstractPortfolio }) => {
    const { t } = useTranslation();

    return (
      <Card>
        <PortfolioHeader data={data} name={name} showDescription />
        <p className="mt-10 text-[12px] font-medium text-center">
          {t('page.dashboard.assets.table.unsupportedPoolType')}
        </p>
      </Card>
    );
  }
);
