import { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { isString } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { findChain } from '@/utils/chain';
import { SafeMessage } from '@safe-global/api-kit';
import { useHistory } from 'react-router-dom';
import { timeago, useWallet } from 'ui/utils';
import { stringToHex } from 'viem';
import { GnosisMessageExplain } from './GnosisMessageExplain';
import { GnosisMessageQueueConfirmations } from './GnosisMessageQueueConfirmations';
import { useRequest } from 'ahooks';

export const GnosisMessageQueueItem = ({
  data,
  networkId,
  safeInfo,
}: {
  data: SafeMessage;
  networkId: string;
  safeInfo: BasicSafeInfo;
}) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const submitAt = dayjs(data.created).valueOf();
  const chain = findChain({
    networkId,
  });

  const agoText = useMemo(() => {
    const now = dayjs().valueOf();
    const ago = timeago(now, submitAt);
    let agoText = '';

    if (ago.hour <= 0 && ago.minute <= 0) {
      ago.minute = 1;
    }
    if (ago.hour < 24) {
      if (ago.hour > 0) {
        agoText += `${ago.hour} ${t('hour')}`;
      }
      if (ago.minute > 0) {
        if (agoText) agoText += ' ';
        agoText += `${ago.minute} ${t('min')}`;
      }
      agoText += ` ${t('ago')}`;
    } else {
      const date = dayjs(submitAt);
      agoText = date.format('YYYY/MM/DD');
    }

    return agoText;
  }, [submitAt]);

  const { runAsync: handleView, loading } = useRequest(
    async () => {
      const account = (await wallet.getCurrentAccount())!;

      await wallet.buildGnosisMessage({
        safeAddress: data.safe,
        account: account,
        version: safeInfo.version,
        networkId: networkId,
        message: data.message,
      });
      await Promise.all([
        data.confirmations.map((item) => {
          return wallet.addPureGnosisMessageSignature({
            signerAddress: item.owner,
            signature: item.signature,
          });
        }),
      ]);
      if (isString(data.message)) {
        wallet.sendRequest({
          method: 'personal_sign',
          params: [stringToHex(data.message), data.safe],
          $ctx: {
            chainId: chain?.id,
            isViewGnosisSafe: true,
          },
        });
      } else {
        wallet.sendRequest({
          method: 'eth_signTypedData_v4',
          params: [data.safe, JSON.stringify(data.message)],
          $ctx: {
            chainId: chain?.id,
            isViewGnosisSafe: true,
          },
        });
      }
      window.close();
    },
    {
      manual: true,
    }
  );

  return (
    <>
      <div className={clsx('queue-item', 'canExec')}>
        <div className="queue-item__time">
          <span>{agoText}</span>
        </div>
        <div className="queue-item__info">
          <GnosisMessageExplain
            data={data}
            onView={handleView}
            isViewLoading={loading}
          />
        </div>
        <GnosisMessageQueueConfirmations
          confirmations={data.confirmations}
          threshold={safeInfo.threshold}
          owners={safeInfo.owners}
        />
      </div>
    </>
  );
};
