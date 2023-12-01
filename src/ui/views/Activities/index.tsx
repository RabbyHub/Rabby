import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs } from 'antd';
import { PageHeader } from 'ui/component';

import './style.less';
import TransactionHistory from '../TransactionHistory';
import SignedTextHistory from '../SignedTextHistory';
import PillsSwitch from '@/ui/component/PillsSwitch';
import clsx from 'clsx';

const Activities = () => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = React.useState<
    'signed_tx' | 'signed_text'
  >('signed_tx');

  return (
    <div className="activities">
      <PageHeader
        canBack={false}
        closeable
        wrapperClassName="bg-r-neutral-bg-2"
        fixed
      >
        {t('page.activities.title')}
      </PageHeader>
      <div className="bg-r-neutral-bg-2 mx-[-20px] sticky top-[64px] z-10">
        <PillsSwitch
          value={selectedTab}
          onTabChange={(v) => {
            setSelectedTab(v);
          }}
          className="flex bg-r-neutral-line w-[228px] mx-[auto] my-[0] h-[32px] p-[2px] mb-[14px]"
          itemClassname={clsx('w-[112px] py-[7px] text-[12px]')}
          itemClassnameInActive={clsx('text-r-neutral-body')}
          itemClassnameActive="bg-r-neutral-bg-1"
          options={
            [
              {
                key: 'signed_tx',
                label: t('page.activities.signedTx.label'),
              },
              {
                key: 'signed_text',
                label: t('page.activities.signedText.label'),
              },
            ] as const
          }
        />
      </div>
      <Tabs
        centered
        className="activities_tabs"
        activeKey={selectedTab}
        animated={{ inkBar: false, tabPane: false }}
        renderTabBar={() => <></>}
      >
        <Tabs.TabPane
          tab={
            <span className="text-13 tab-title">
              {t('page.activities.signedTx.label')}
            </span>
          }
          key="signed_tx"
        >
          <TransactionHistory />
        </Tabs.TabPane>
        <Tabs.TabPane
          tab={
            <span className="text-13 tab-title">
              {t('page.activities.signedText.label')}
            </span>
          }
          key="signed_text"
        >
          <SignedTextHistory />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default Activities;
