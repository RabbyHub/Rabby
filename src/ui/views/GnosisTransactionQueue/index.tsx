import { SafeTransactionItem } from '@rabby-wallet/gnosis-sdk/dist/api';
import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { GnosisTransactionQueueList } from './GnosisTransactionQueueList';
import './style.less';
import { sortBy } from 'lodash';
import { useAccount } from '@/ui/store-hooks';
import { useGnosisNetworks } from '@/ui/hooks/useGnosisNetworks';
import { useGnosisPendingTxs } from '@/ui/hooks/useGnosisPendingTxs';
import moment from 'moment';
import { findChain, findChainByEnum } from '@/utils/chain';

const getTabs = (
  networks: string[],
  pendingMap: Record<string, SafeTransactionItem[]>
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
        txs: pendingTxs,
      };
    })
    .filter((item) => !!item);
  return sortBy(
    res,
    (item) => -(item?.count || 0),
    (item) => {
      return -moment(item?.txs?.[0]?.submissionDate || 0).valueOf();
    }
  );
};

const GnosisTransactionQueue = () => {
  const { t } = useTranslation();
  const wallet = useWallet();

  const [account] = useAccount();
  const { data: networks } = useGnosisNetworks({ address: account?.address });
  const { data: pendingTxs, loading } = useGnosisPendingTxs({
    address: account?.address,
  });

  const tabs = useMemo(() => {
    return getTabs(
      networks || [],
      (pendingTxs?.results || []).reduce((res, item) => {
        res[item.networkId] = item.txs;
        return res;
      }, {} as Record<string, SafeTransactionItem[]>)
    );
  }, [networks, pendingTxs]);

  const [activeKey, setActiveKey] = useState<CHAINS_ENUM | null>(
    tabs[0]?.key || null
  );

  const activeData = useMemo(() => {
    return tabs.find((item) => item?.chain?.enum === activeKey);
  }, [tabs, activeKey]);

  useEffect(() => {
    setActiveKey(tabs[0]?.key || null);
  }, [tabs[0]?.key]);

  useEffect(() => {
    if (account?.address) {
      wallet.syncGnosisNetworks(account?.address);
    }
  }, [account?.address]);

  return (
    <div className="queue">
      <PageHeader fixed>{t('page.safeQueue.title')}</PageHeader>
      <div className="tabs-container">
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
        <GnosisTransactionQueueList
          pendingTxs={activeData?.txs}
          usefulChain={activeKey}
          key={activeKey}
          loading={loading}
        />
      )}
    </div>
  );
};

export default GnosisTransactionQueue;
