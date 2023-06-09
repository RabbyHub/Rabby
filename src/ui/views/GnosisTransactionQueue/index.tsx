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
import { useAccount } from '@/ui/store-hooks';
import { useGnosisNetworks } from '@/ui/hooks/useGnosisNetworks';
import { useGnosisPendingTxs } from '@/ui/hooks/useGnosisPendingTxs';
import moment from 'moment';

const getTabs = (
  networks: string[],
  pendingMap: Record<string, SafeTransactionItem[]>
) => {
  const res = networks
    ?.map((networkId) => {
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
        <GnosisTransactionQueueList
          pendingTxs={activeData?.txs}
          chain={activeKey}
          key={activeKey}
          loading={loading}
        />
      )}
    </div>
  );
};

export default GnosisTransactionQueue;
