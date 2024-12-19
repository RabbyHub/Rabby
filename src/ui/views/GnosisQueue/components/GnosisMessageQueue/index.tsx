import { useGnosisNetworks } from '@/ui/hooks/useGnosisNetworks';
import { useGnosisPendingMessages } from '@/ui/hooks/useGnosisPendingMessages';
import { useAccount } from '@/ui/store-hooks';
import { findChain, findChainByEnum } from '@/utils/chain';
import { SafeMessage } from '@rabby-wallet/gnosis-sdk';
import clsx from 'clsx';
import { CHAINS_ENUM } from 'consts';
import { sortBy } from 'lodash';
import moment from 'moment';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import { GnosisMessageQueueList } from './GnosisMessageQueueList';

const getTabs = (
  networks: string[],
  pendingMap: Record<string, SafeMessage[]>
) => {
  const res = networks
    ?.map((networkId) => {
      const chain = findChain({
        networkId: networkId,
      });
      if (!chain) {
        return;
      }
      const pendingTxs = pendingMap[chain?.network] || [];
      return {
        title: `${chain?.name} (${pendingTxs.length})`,
        key: chain.enum,
        chain,
        count: pendingTxs.length || 0,
        messages: pendingTxs,
      };
    })
    .filter((item) => !!item);
  return sortBy(
    res,
    (item) => -(item?.count || 0),
    (item) => {
      return -moment(item?.messages?.[0]?.created || 0).valueOf();
    }
  );
};

export const GnosisMessageQueue = () => {
  const { t } = useTranslation();
  const wallet = useWallet();

  const [account] = useAccount();
  const { data: networks } = useGnosisNetworks({ address: account?.address });
  const { data: pendingMessages, loading } = useGnosisPendingMessages({
    address: account?.address,
  });

  const tabs = useMemo(() => {
    return getTabs(
      networks || [],
      (pendingMessages?.results || []).reduce((res, item) => {
        res[item.networkId] = item.messages;
        return res;
      }, {} as Record<string, SafeMessage[]>)
    );
  }, [networks, pendingMessages]);

  const [activeKey, setActiveKey] = useState<CHAINS_ENUM | null>(
    tabs[0]?.key || null
  );

  const activeData = useMemo(() => {
    return tabs.find((item) => item?.chain?.enum === activeKey);
  }, [tabs, activeKey]);

  useEffect(() => {
    setActiveKey(tabs[0]?.key || null);
  }, [tabs[0]?.key]);

  return (
    <div className="flex flex-col h-full">
      <div className="tabs-container top-0">
        <div className="tabs">
          {tabs?.map((tab) => {
            return (
              <div
                className={clsx(
                  'tabs-item',
                  activeKey === tab?.key && 'is-active'
                )}
                onClick={() => {
                  setActiveKey(tab?.key || null);
                }}
                key={tab?.key}
              >
                <div className="tabs-item-title">{tab?.title}</div>
              </div>
            );
          })}
        </div>
      </div>
      {activeKey && findChainByEnum(activeKey) && (
        <GnosisMessageQueueList
          pendingTxs={activeData?.messages}
          usefulChain={activeKey}
          key={activeKey}
          loading={loading}
        />
      )}
    </div>
  );
};
