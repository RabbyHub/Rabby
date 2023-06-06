import {
  SafeInfo,
  SafeTransactionItem,
} from '@rabby-wallet/gnosis-sdk/dist/api';
import { Button, Skeleton, Tooltip } from 'antd';
import { ExplainTxResponse } from 'background/service/openapi';
import { Account } from 'background/service/preference';
import clsx from 'clsx';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { toChecksumAddress } from 'web3-utils';

import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types';
import {
  CHAINS,
  CHAINS_ENUM,
  INTERNAL_REQUEST_ORIGIN,
  KEYRING_CLASS,
} from 'consts';
import { intToHex } from 'ethereumjs-util';
import IconUser from 'ui/assets/address-management.svg';
import IconChecked from 'ui/assets/checked.svg';
import IconUnknown from 'ui/assets/icon-unknown.svg';
import IconTagYou from 'ui/assets/tag-you.svg';
import IconUnCheck from 'ui/assets/uncheck.svg';
import { NameAndAddress, PageHeader } from 'ui/component';
import { isSameAddress, timeago, useWallet } from 'ui/utils';
import { validateEOASign, validateETHSign } from 'ui/utils/gnosis';
import { splitNumberByStep } from 'ui/utils/number';
import { GnosisTransactionQueueList } from './GnosisTransactionQueueList';
import './style.less';
import { sortBy } from 'lodash';
import { useRequest } from 'ahooks';

const getTabs = (
  networks: string[],
  pendingMap: Record<string, SafeTransactionItem[]>
) => {
  const res = networks?.map((networkId) => {
    const chain = Object.values(CHAINS).find(
      (chain) => chain.network === networkId
    );
    if (!chain) {
      return;
    }
    const pendingTxs = pendingMap[chain?.network] || [];
    return {
      title: `${chain?.name} (${pendingTxs.length})`,
      key: chain.enum,
      chain,
      count: pendingTxs.length || 0,
    };
  });
  return sortBy(res, 'count').reverse();
};

const GnosisTransactionQueue = () => {
  const wallet = useWallet();
  const [networkId, setNetworkId] = useState('1');
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const { t } = useTranslation();
  const [transactionsGroup, setTransactionsGroup] = useState<
    Record<string, SafeTransactionItem[]>
  >({});
  const [submitDrawerVisible, setSubmitDrawerVisible] = useState(false);
  const [
    submitTransaction,
    setSubmitTransaction,
  ] = useState<SafeTransactionItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadFaild, setIsLoadFaild] = useState(false);

  const { gnosisNetworkIds } = useRabbySelector((state) => state.chains);

  const [networks, setNetworks] = useState(gnosisNetworkIds);
  const [tabs, setTabs] = useState(getTabs(networks, {}));
  const [activeKey, setActiveKey] = useState<CHAINS_ENUM | null>(
    tabs[0]?.key || null
  );

  useRequest(
    async () => {
      const account = (await wallet.syncGetCurrentAccount())!;
      if (account?.address && account?.type === KEYRING_CLASS.GNOSIS) {
        return wallet.getGnosisNetworkIds(account?.address);
      }
    },
    {
      refreshDeps: [],

      onSuccess(res) {
        if (res) {
          setNetworks(res);
        }
      },
    }
  );

  useRequest(
    async () => {
      const account = (await wallet.syncGetCurrentAccount())!;
      if (account?.address && account?.type === KEYRING_CLASS.GNOSIS) {
        return wallet.getGnosisAllPendingTxs(account?.address);
      }
    },
    {
      refreshDeps: [],
      onSuccess(res) {
        if (res) {
          const t = getTabs(
            networks,
            res.results.reduce((res, item) => {
              res[item.networkId] = item.txs;
              return res;
            }, {} as Record<string, SafeTransactionItem[]>)
          );
          setTabs(t);
          setActiveKey(t[0]?.key || null);
        }
      },
    }
  );

  return (
    <div className="queue">
      <PageHeader fixed>{t('Queue')}</PageHeader>
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
      {activeKey && (
        <GnosisTransactionQueueList chain={activeKey} key={activeKey} />
      )}
    </div>
  );
};

export default GnosisTransactionQueue;
