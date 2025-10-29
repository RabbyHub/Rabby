import PillsSwitch from '@/ui/component/PillsSwitch';
import { useGnosisPendingTxs } from '@/ui/hooks/useGnosisPendingTxs';
import { useAccount } from '@/ui/store-hooks';
import { Tabs } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { GnosisTransactionQueue } from './components/GnosisTransactionQueue';
import './style.less';
import { GnosisMessageQueue } from './components/GnosisMessageQueue';
import { useGnosisPendingMessages } from '@/ui/hooks/useGnosisPendingMessages';
import { useSyncGnosisNetworks } from '@/ui/hooks/useSyncGnonisNetworks';
import { sum } from 'lodash';
import clsx from 'clsx';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';

export const GnosisQueue: React.FC<{
  isInModal?: boolean;
  onClose?(e: React.MouseEvent<HTMLElement>): void;
}> = ({ isInModal, onClose }) => {
  const { t } = useTranslation();

  const [account] = useAccount();
  const { data: pendingTxs, loading } = useGnosisPendingTxs({
    address: account?.address,
  });

  const { data: messages } = useGnosisPendingMessages({
    address: account?.address,
  });

  const tabs = useMemo(() => {
    return [
      {
        label: `Transaction (${pendingTxs?.total || 0})`,
        key: 'transaction' as const,
      },
      {
        label: `Message (${messages?.total || 0})`,
        key: 'message' as const,
      },
    ];
  }, [pendingTxs?.total, messages?.total]);

  const total = useMemo(() => {
    return sum([pendingTxs?.total, messages?.total].map((item) => item || 0));
  }, [pendingTxs?.total, messages?.total]);

  const [activeKey, setActiveKey] = useState<'transaction' | 'message'>(
    tabs[0]?.key
  );

  useSyncGnosisNetworks({ address: account?.address });

  return (
    <div
      className={clsx(
        'queue',
        isInModal ? 'min-h-0 h-[600px] overflow-auto' : ''
      )}
    >
      {isInModal ? (
        <div className="text-[20px] leading-[24px] font-medium text-center py-[16px]">
          {t('page.safeQueue.title', {
            total: total,
          })}
          <div
            onClick={onClose}
            className="cursor-pointer absolute top-[18px] right-[20px]"
          >
            <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot " />
          </div>
        </div>
      ) : (
        <PageHeader fixed className="pb-[16px]">
          {t('page.safeQueue.title', {
            total: total,
          })}
        </PageHeader>
      )}
      <div className="flex items-center justify-center mb-[16px]">
        <PillsSwitch
          className="p-[2px]"
          itemClassname="p-[7px] w-[120px]"
          options={tabs}
          value={activeKey}
          onTabChange={setActiveKey}
        ></PillsSwitch>
      </div>
      <Tabs
        activeKey={activeKey}
        onChange={(v: any) => setActiveKey(v)}
        className="h-full"
      >
        <Tabs.TabPane key={'transaction'}>
          <GnosisTransactionQueue />
        </Tabs.TabPane>
        <Tabs.TabPane key={'message'}>
          <GnosisMessageQueue />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};
