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

  const { loadings, data: safeData, networks } = useRabbySelector(
    (state) => state.safe
  );

  const dispatch = useRabbyDispatch();
  console.log(loadings, safeData);

  const [activeKey, setActiveKey] = useState<CHAINS_ENUM | null>();

  const tabs = useMemo(() => {
    return networks?.map((networkId) => {
      const chain = Object.values(CHAINS).find(
        (chain) => chain.network === networkId
      );
      if (!chain) {
        return;
      }
      const loading = loadings[chain?.enum];
      const pendingTxs = safeData[chain?.enum]?.pendingTxs || [];
      return {
        title: `${chain?.name} ${loading ? '' : `(${pendingTxs.length})`}`,
        key: chain.enum,
        chain,
      };
    });
  }, [networks, loadings, safeData]);

  useEffect(() => {
    dispatch.safe.getAllChainsSafeData();
  }, []);

  useEffect(() => {
    if (networks?.length) {
      setActiveKey(tabs?.[0]?.key);
    }
  }, [networks]);

  const activeData = useMemo(() => {
    if (!activeKey) {
      return;
    }
    const data = safeData[activeKey];
    return {
      chain: activeKey,
      txs: data?.pendingTxs || [],
      safeInfo: data?.safeInfo,
      loading: loadings[activeKey],
    };
  }, [activeKey, safeData, loadings]);

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
                  setActiveKey(tab?.key);
                }}
                key={tab?.key}
              >
                <div className="tabs-item-title">{tab?.title}</div>
              </div>
            );
          })}
        </div>
      </div>
      {activeData && !activeData.loading && (
        <GnosisTransactionQueueList {...activeData} />
      )}
    </div>
  );
};

export default GnosisTransactionQueue;
