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
import { SafeMessage } from '@safe-global/api-kit';
import { CHAINS_ENUM } from 'consts';
import { Virtuoso } from 'react-virtuoso';
import { isSameAddress, useWallet } from 'ui/utils';
import { validateEOASign, validateETHSign } from 'ui/utils/gnosis';
import { GnosisMessageQueueItem } from './GnosisMessageQueueItem';

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

const validateConfirmation = (
  txHash: string,
  signature: string,
  ownerAddress: string,
  type: string,
  version: string,
  safeAddress: string,
  tx: SafeTransactionDataPartial,
  networkId: number,
  owners: string[]
) => {
  if (!owners.find((owner) => isSameAddress(owner, ownerAddress))) return false;
  switch (type) {
    case 'EOA':
      try {
        return validateEOASign(
          signature,
          ownerAddress,
          tx,
          version,
          safeAddress,
          networkId
        );
      } catch (e) {
        return false;
      }
    case 'ETH_SIGN':
      try {
        return validateETHSign(signature, txHash, ownerAddress);
      } catch (e) {
        return false;
      }
    default:
      return false;
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

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadFaild, setIsLoadFaild] = useState(false);
  const [account] = useAccount();

  const { data: safeInfo, loading: isSafeInfoLoading } = useGnosisSafeInfo({
    address: account?.address,
    networkId,
  });

  const init = async (txs: SafeTransactionItem[], info: BasicSafeInfo) => {
    try {
      const account = (await wallet.syncGetCurrentAccount())!;

      const txHashValidation = await Promise.all(
        txs.map(async (safeTx) => {
          const tx: SafeTransactionDataPartial = {
            data: safeTx.data || '0x',
            gasPrice: safeTx.gasPrice ? Number(safeTx.gasPrice) : 0,
            gasToken: safeTx.gasToken,
            refundReceiver: safeTx.refundReceiver,
            to: safeTx.to,
            value: numberToHex(safeTx.value),
            safeTxGas: safeTx.safeTxGas,
            nonce: safeTx.nonce,
            operation: safeTx.operation,
            baseGas: safeTx.baseGas,
          };
          return wallet.validateGnosisTransaction(
            {
              account: account,
              tx,
              version: info.version,
              networkId,
            },
            safeTx.safeTxHash
          );
        })
      );

      setIsLoading(false);

      const transactions = txs
        .filter((safeTx, index) => {
          if (!txHashValidation[index]) return false;
          const tx: SafeTransactionDataPartial = {
            data: safeTx.data || '0x',
            gasPrice: safeTx.gasPrice ? Number(safeTx.gasPrice) : 0,
            gasToken: safeTx.gasToken,
            refundReceiver: safeTx.refundReceiver,
            to: safeTx.to,
            value: numberToHex(safeTx.value),
            safeTxGas: safeTx.safeTxGas,
            nonce: safeTx.nonce,
            operation: safeTx.operation,
            baseGas: safeTx.baseGas,
          };

          return safeTx.confirmations.every((confirm) =>
            validateConfirmation(
              safeTx.safeTxHash,
              confirm.signature,
              confirm.owner,
              confirm.signatureType,
              info.version,
              info.address,
              tx,
              Number(networkId),
              info.owners
            )
          );
        })
        .sort((a, b) => {
          return dayjs(a.submissionDate).isAfter(dayjs(b.submissionDate))
            ? -1
            : 1;
        });
      // setTransactionsGroup(groupBy(transactions, 'nonce'));
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      setIsLoadFaild(true);
    }
  };
  const list = pendingTxs || [];

  return (
    <div className="queue-list h-full">
      {safeInfo && list.length ? (
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
