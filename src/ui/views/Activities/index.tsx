import React from 'react';
import { useTranslation } from 'react-i18next';
// import { Tabs } from 'antd';
// import { PageHeader } from 'ui/component';

import './style.less';
import TransactionHistory from '../TransactionHistory';
import SignedTextHistory from '../SignedTextHistory';
import PillsSwitch from '@/ui/component/PillsSwitch';
import clsx from 'clsx';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from '@/ui/component/PageContainer';
import { Box, SegmentedControl, Tabs, Text } from '@radix-ui/themes';

type TabType = 'signed_tx' | 'signed_text';

const Activities = () => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = React.useState<TabType>('signed_tx');

  return (
    <PageContainer>
      <PageHeader showBackButton>
        <PageHeading>{t('page.activities.title')}</PageHeading>
      </PageHeader>

      <PageBody>
        {/*<SegmentedControl.Root
          defaultValue={selectedTab}
          onValueChange={(value) => setSelectedTab(value as TabType)}
        >
          <SegmentedControl.Item value={'signed_tx'}>
            {t('page.activities.signedTx.label')}
          </SegmentedControl.Item>
          <SegmentedControl.Item value="signed_text">
            {t('page.activities.signedText.label')}
          </SegmentedControl.Item>
          <SegmentedControl.Item value="sent">Sent</SegmentedControl.Item>
        </SegmentedControl.Root>*/}
        <Tabs.Root
          defaultValue={selectedTab}
          onValueChange={(value) => setSelectedTab(value as TabType)}
        >
          <Tabs.List
            highContrast
            style={{
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--gray-1)',
              zIndex: 10,
            }}
          >
            <Tabs.Trigger value="signed_tx">
              {t('page.activities.signedTx.label')}
            </Tabs.Trigger>
            <Tabs.Trigger value="signed_text">
              {t('page.activities.signedText.label')}
            </Tabs.Trigger>
          </Tabs.List>

          <Box pt="3">
            <Tabs.Content value="signed_tx">
              <Text size="2">
                <TransactionHistory />
              </Text>
            </Tabs.Content>

            <Tabs.Content value="signed_text">
              <Text size="2">
                <SignedTextHistory />
              </Text>
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </PageBody>

      {/*<div className="activities">
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
      </div>*/}
    </PageContainer>
  );
};

export default Activities;
