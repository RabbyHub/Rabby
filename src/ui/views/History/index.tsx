import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

import { ReactComponent as RcIconArrowRight } from '@/ui/assets/history/icon-arrow-right.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { PageHeader } from 'ui/component';
import { HistoryList } from './components/HistoryList';
import './style.less';

const Null = () => null;

const History = () => {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <div className="txs-history">
      <PageHeader className="transparent-wrap" fixed>
        {t('page.transactions.title')}
      </PageHeader>
      <div
        className="filter-scam-nav hover:border-blue-light hover:bg-blue-light hover:bg-opacity-10"
        onClick={() => {
          history.push('/history/filter-scam?net=mainnet');
        }}
      >
        {t('page.transactions.filterScam.btn')}
        <ThemeIcon src={RcIconArrowRight} />
      </div>
      <HistoryList />
    </div>
  );
};

const HistoryFilterScam = () => {
  const { t } = useTranslation();

  return (
    <div className="txs-history">
      <PageHeader className="transparent-wrap" fixed>
        {t('page.transactions.filterScam.title')}
      </PageHeader>
      <HistoryList isFilterScam={true} />
    </div>
  );
};

export const HistoryPage = ({
  isFitlerScam = false,
}: {
  isFitlerScam?: boolean;
}) => {
  return isFitlerScam ? <HistoryFilterScam /> : <History />;
};
