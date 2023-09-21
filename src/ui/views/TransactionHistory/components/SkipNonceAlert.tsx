import { TransactionGroup } from '@/background/service/transactionHistory';
import { useAccount } from '@/ui/store-hooks';
import { intToHex, useWallet } from '@/ui/utils';
import { findChainByID } from '@/utils/chain';
import { findMaxGasTx } from '@/utils/tx';
import { GasLevel } from '@rabby-wallet/rabby-api/dist/types';
import { useRequest } from 'ahooks';
import { ConnectedSite } from 'background/service/permission';
import { CHAINS, INTERNAL_REQUEST_ORIGIN } from 'consts';
import { flatten, maxBy } from 'lodash';
import React from 'react';
import { Trans } from 'react-i18next';
import styled from 'styled-components';
import IconWarning from 'ui/assets/signature-record/warning.svg';

const Wraper = styled.div`
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

const AlertDetail = ({
  data,
  onSubmitTx,
}: {
  data: TransactionGroup;
  onSubmitTx?: (item: TransactionGroup) => void;
}) => {
  const chain = findChainByID(data.chainId);

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
        >
          Nonce #{data.nonce} skipped on {chain?.name || 'Unknown'} chain. This
          may cause pending transactions ahead.{' '}
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

export const SkipNonceAlert = ({
  pendings,
}: {
  pendings: TransactionGroup[];
}) => {
  const [account] = useAccount();
  const wallet = useWallet();

  const { data } = useRequest(async () => {
    if (!account?.address) {
      return;
    }
    const res = await wallet.getSkipedTxs(account?.address);
    return flatten(Object.values(res));
  });

  const handleOnChainCancel = async (item: TransactionGroup) => {
    // todo can cancel ?

    const maxGasTx = findMaxGasTx(item.txs)!;
    const maxGasPrice = Number(
      maxGasTx.rawTx.gasPrice || maxGasTx.rawTx.maxFeePerGas || 0
    );
    const chainServerId = Object.values(CHAINS).find(
      (chain) => chain.id === item.chainId
    )!.serverId;
    const gasLevels: GasLevel[] = await wallet.openapi.gasMarket(chainServerId);
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

  if (!pendings.length || !data?.length) {
    return null;
  }

  return (
    <Wraper>
      {data?.map((item) => {
        return (
          <AlertDetail
            key={item.nonce}
            data={item}
            onSubmitTx={handleOnChainCancel}
          />
        );
      })}
    </Wraper>
  );
};
