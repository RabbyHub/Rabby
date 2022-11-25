import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs } from 'antd';
import { PageHeader } from 'ui/component';

import './style.less';
import TransactionHistory from '../TransactionHistory';
import SignedTextHistory from '../SignedTextHistory';

const Activities = () => {
  const { t } = useTranslation();

  return (
    <div className="activities">
      <PageHeader fixed>{t('Signature Record')}</PageHeader>
      <Tabs
        centered
        className="activities_tabs"
        defaultActiveKey="signed_tx"
        animated={{ inkBar: false, tabPane: false }}
      >
        <Tabs.TabPane
          tab={<span className="text-13 tab-title">{t('Transactions')}</span>}
          key="signed_tx"
        >
          <TransactionHistory />
        </Tabs.TabPane>
        <Tabs.TabPane
          tab={<span className="text-13 tab-title">{t('Texts')}</span>}
          key="signed_text"
        >
          <SignedTextHistory />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default Activities;
