import { TransactionGroup } from '@/background/service/transactionHistory';
import { useAccount } from '@/ui/store-hooks';
import { intToHex, useWallet } from '@/ui/utils';
import { findChain, findChainByID } from '@/utils/chain';
import { findMaxGasTx } from '@/utils/tx';
import { Chain } from '@debank/common';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import { useInterval, useRequest } from 'ahooks';
import { message } from 'antd';
import { CHAINS } from 'consts';
import dayjs from 'dayjs';
import { flatten, groupBy, maxBy, sortBy } from 'lodash';
import React, { useMemo, useState } from 'react';
import { Trans } from 'react-i18next';
import styled from 'styled-components';
import IconWarning from 'ui/assets/signature-record/warning.svg';

const Warper = styled.div`
  margin-bottom: 16px;

  .alert-detail {
    display: flex;
    align-items: start;
    padding: 8px 12px 8px 8px;
    border-radius: 6px;
    border: 0.5px solid var(--r-orange-default, #ffb020);
    border: 1px solid var(--r-orange-default, #ffb020);
    background: var(--r-orange-light, rgba(255, 176, 32, 0.15));
    gap: 6px;

    &:not(:last-child) {
      margin-bottom: 12px;
    }

    &-content {
      color: var(--r-neutral-title-1, #192945);
      font-size: 13px;
      font-weight: 400;
      line-height: 18px; /* 138.462% */

      .link {
        color: var(--r-blue-default, #7084ff);
        text-decoration-line: underline;
        cursor: pointer;
      }
    }
  }
`;

const SkipAlertDetail = ({
  data,
  onSubmitTx,
}: {
  data: TransactionGroup;
  onSubmitTx?: (item: TransactionGroup) => void;
}) => {
  const chain = findChainByID(data.chainId);
  const nonce = data.nonce;
  const chainName = chain?.name || 'Unknown';

  return (
    <div className="alert-detail">
      <img src={IconWarning} alt="" />
      <div className="alert-detail-content">
        <Trans
          i18nKey="page.activities.signedTx.SkipNonceAlert.alert"
          values={{
            nonce: data.nonce,
            chainName: chain?.name || 'Unknown',
          }}
          nonce={nonce}
          chainName={chainName}
        >
          Nonce #{{ nonce }} skipped on {{ chainName }} chain. This may cause
          pending transactions ahead.{' '}
          <span
            className="link"
            onClick={() => {
              onSubmitTx?.(data);
            }}
          >
            Submit a tx
          </span>{' '}
          on chain to resolve
        </Trans>
      </div>
    </div>
  );
};

const ClearPendingAlertDetail = ({
  data,
  onClearPending,
}: {
  data: TransactionGroup[];
  onClearPending?: (chain: Chain) => void;
}) => {
  const chain = findChainByID(data?.[0].chainId);
  const chainName = chain?.name || 'Unknown';
  const nonces = data.map((item) => `#${item.nonce}`).join('; ');

  return (
    <div className="alert-detail">
      <img src={IconWarning} alt="" />
      <div className="alert-detail-content">
        <Trans
          i18nKey="page.activities.signedTx.SkipNonceAlert.clearPendingAlert"
          values={{
            nonces: nonces,
            chainName: chainName,
          }}
          nonces={nonces}
          chainName={chainName}
        >
          Transaction ({chainName} {nonces}) has been pending for over 3
          minutes. You can{' '}
          <span
            className="link"
            onClick={() => {
              onClearPending?.(chain!);
            }}
          >
            clear pending transactions on this chain
          </span>{' '}
          and initiate a new one.
        </Trans>
      </div>
    </div>
  );
};

export const SkipNonceAlert = ({
  pendings,
  onClearPending,
}: {
  pendings: TransactionGroup[];
  onClearPending?: () => void;
}) => {
  const [account] = useAccount();
  const wallet = useWallet();

  const { data } = useRequest(
    async () => {
      if (!account?.address || !pendings.length) {
        return;
      }
      const res = await wallet.getSkipedTxs(account?.address);
      return flatten(Object.values(res));
    },
    {
      refreshDeps: [account?.address, pendings],
    }
  );

  const handleOnChainCancel = async (item: TransactionGroup) => {
    const maxGasTx = findMaxGasTx(item.txs)!;
    const maxGasPrice = Number(
      maxGasTx.rawTx.gasPrice || maxGasTx.rawTx.maxFeePerGas || 0
    );
    const chain = findChain({
      id: item.chainId,
    });
    if (!chain) {
      throw new Error('chainServerId not found');
    }
    const gasLevels: GasLevel[] = chain.isTestnet
      ? await wallet.getCustomTestnetGasMarket({
          chainId: chain.id,
        })
      : await wallet.openapi.gasMarket(chain.serverId);
    const maxGasMarketPrice = maxBy(gasLevels, (level) => level.price)!.price;
    await wallet.sendRequest({
      method: 'eth_sendTransaction',
      params: [
        {
          from: maxGasTx.rawTx.from,
          to: maxGasTx.rawTx.from,
          gasPrice: intToHex(Math.max(maxGasPrice * 2, maxGasMarketPrice)),
          value: '0x0',
          chainId: item.chainId,
          nonce: intToHex(item.nonce),
          isCancel: true,
          reqId: maxGasTx.reqId,
        },
      ],
    });
    window.close();
  };

  const handleClearPending = async (chain: Chain) => {
    if (!chain.id) {
      return;
    }
    await wallet.clearAddressPendingTransactions(account!.address, chain.id);
    message.success('Clear pending transactions success');
    onClearPending?.();
  };

  const [now, setNow] = useState(dayjs());

  useInterval(() => {
    setNow(dayjs());
  }, 1000 * 60);

  const needClearPendingTxs = useMemo(() => {
    return Object.entries(groupBy(pendings, (item) => item.chainId))
      .map(([key, value]) => {
        return {
          chain: key,
          data: sortBy(value, (item) => -item.nonce),
          needClear: value.some((item) => {
            return dayjs(item.createdAt).isBefore(now.subtract(3, 'minute'));
          }),
        };
      })
      .filter((item) => item.needClear);
  }, [pendings, now]);

  if (!data?.length && !needClearPendingTxs?.length) {
    return null;
  }

  return (
    <Warper>
      {data?.map((item) => {
        return (
          <SkipAlertDetail
            key={item.nonce}
            data={item}
            onSubmitTx={handleOnChainCancel}
          />
        );
      })}
      {!data?.length &&
        needClearPendingTxs?.map((item) => {
          return (
            <ClearPendingAlertDetail
              key={item.chain}
              data={item.data}
              onClearPending={handleClearPending}
            />
          );
        })}
    </Warper>
  );
};
