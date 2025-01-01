import { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import { SafeTransactionItem } from '@rabby-wallet/gnosis-sdk/dist/api';
import dayjs from 'dayjs';
import { groupBy } from 'lodash';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { numberToHex } from 'web3-utils';

import { useGnosisSafeInfo } from '@/ui/hooks/useGnosisSafeInfo';
import { useAccount } from '@/ui/store-hooks';
import { findChain } from '@/utils/chain';
import { LoadingOutlined } from '@ant-design/icons';
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types';
import { SafeMessage } from '@rabby-wallet/gnosis-sdk';
import { CHAINS_ENUM } from 'consts';
import { Virtuoso } from 'react-virtuoso';
import { isSameAddress, useWallet } from 'ui/utils';
import { validateEOASign, validateETHSign } from 'ui/utils/gnosis';
import { GnosisMessageQueueItem } from './GnosisMessageQueueItem';
import { generateTypedData } from '@safe-global/protocol-kit';
import { verifyTypedData } from 'viem';
import { useRequest } from 'ahooks';

interface TransactionConfirmationsProps {
  confirmations: SafeMessage['confirmations'];
  threshold: number;
  owners: string[];
}

export type ConfirmationProps = {
  owner: string;
  type: string;
  hash: string;
  signature: string | null;
};

// todo validate
const verifyConfirmation = ({
  owners,
  ownerAddress,
  type,
  message,
  chainId,
  safeAddress,
  safeVersion,
  signature,
}: {
  txHash: string;
  signature: string;
  ownerAddress: string;
  type: string;
  safeVersion: string;
  safeAddress: string;
  tx: SafeTransactionDataPartial;
  chainId: number;
  owners: string[];
  message: string | Record<string, any>;
}) => {
  if (!owners.find((owner) => isSameAddress(owner, ownerAddress))) {
    return false;
  }
  const typedData = generateTypedData({
    safeAddress: safeAddress,
    safeVersion: safeVersion,
    chainId: BigInt(chainId),
    data: message as any,
  });
  switch (type) {
    case 'EOA':
      try {
        return verifyTypedData({
          address: ownerAddress as `0x${string}`,
          ...(typedData as any),
          signature: signature as `0x${string}`,
        });
      } catch (e) {
        return false;
      }

    default:
      return true;
  }
};

/**
 * @description chain is expected always useful
 * @param props
 * @returns
 */
export const GnosisMessageQueueList = (props: {
  usefulChain: CHAINS_ENUM;
  pendingTxs?: SafeMessage[];
  loading?: boolean;
}) => {
  const { usefulChain: chain, pendingTxs, loading } = props;
  const networkId =
    findChain({
      enum: chain,
    })?.network || '';
  const wallet = useWallet();
  const { t } = useTranslation();

  const [account] = useAccount();

  const { data: safeInfo, loading: isSafeInfoLoading } = useGnosisSafeInfo({
    address: account?.address,
    networkId,
  });

  const { data: list, loading: isLoading, error: isLoadFaild } = useRequest(
    async () => {
      const account = (await wallet.syncGetCurrentAccount())!;

      const messageHashValidation = await Promise.all(
        (pendingTxs || []).map(async (item) => {
          return wallet.validateGnosisMessage(
            {
              address: account.address,
              chainId: Number(networkId),
              message: item.message,
            },
            item.messageHash
          );
        })
      );

      const result = (pendingTxs || []).filter((item, index) => {
        if (!messageHashValidation[index]) {
          return false;
        }

        // todo
        // return item.confirmations.every((confirm) => {});

        return true;
      });
      return result;
    },
    {
      refreshDeps: [pendingTxs],
    }
  );

  return (
    <div className="queue-list h-full">
      {safeInfo && list?.length ? (
        <Virtuoso
          style={{
            height: '100%',
          }}
          data={list}
          itemContent={(_, item) => {
            return (
              <div key={item.messageHash} className="pb-[20px]">
                <GnosisMessageQueueItem
                  data={item}
                  networkId={networkId}
                  safeInfo={safeInfo}
                />
              </div>
            );
          }}
        ></Virtuoso>
      ) : (
        <div className="tx-history__empty">
          {isLoading || loading || isSafeInfoLoading ? (
            <>
              <LoadingOutlined className="text-24 text-gray-content" />
              <p className="text-14 text-gray-content mt-12">
                {t('page.safeMessageQueue.loading')}
              </p>
            </>
          ) : isLoadFaild ? (
            <>
              <img
                className="load-faild"
                src="./images/gnosis-load-faild.png"
              />
              <p className="load-faild-desc">
                {t('page.safeQueue.loadingFaild')}
              </p>
            </>
          ) : (
            <>
              <img className="no-data" src="./images/nodata-tx.png" />
              <p className="text-14 text-gray-content mt-8">
                {t('page.safeMessageQueue.noData')}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
