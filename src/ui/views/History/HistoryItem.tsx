import {
  TokenItem,
  TxDisplayItem,
  TxHistoryItem,
} from '@/background/service/openapi';
import { sinceTime, useWallet } from 'ui/utils';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { getChain } from '@/utils';
import { numberWithCommasIsLtOne } from 'ui/utils';
import { TokenChange, TxId, TxInterAddressExplain } from '@/ui/component';
import { useTranslation } from 'react-i18next';
import { useAsync } from 'react-use';

import IconInputData from './icons/input-data.svg';
import { useRabbySelector } from '@/ui/store';
import { Skeleton, Tooltip } from 'antd';
import { AddressType } from '@/ui/utils/address';
import { Chain } from '@debank/common';
import {
  useCheckAddressType,
  useParseContractAddress,
} from '@/ui/hooks/useParseAddress';
import { formatTxInputDataOnERC20 } from '@/ui/utils/transaction';
import { findChainByServerID } from '@/utils/chain';

export type HistoryItemActionContext = {
  parsedInputData: string;
};

type ViewMessageTriggerProps = {
  userAddress: string;
  /**
   * @description tx input data, hex format or utf8 format
   */
  txInputData: string | null;
  chainItem: Chain;
  onViewInputData?: (ctx: HistoryItemActionContext) => void;
};

function ViewMessageTriggerForEoa({
  userAddress,
  txInputData,
  chainItem,
  onViewInputData,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & ViewMessageTriggerProps) {
  const { t } = useTranslation();

  const utf8Data = useMemo(() => {
    if (!txInputData) return null;

    return formatTxInputDataOnERC20(txInputData).utf8Data;
  }, [txInputData]);

  if (!utf8Data) return null;

  return (
    <Tooltip
      overlayClassName="rectangle J_tipInputData text-r-neutral-title-2 text-[12px]"
      placement="topLeft"
      arrowPointAtCenter
      // The transaction includes a message
      title={t('page.transactions.txHistory.tipInputData')}
    >
      <span
        {...props}
        className="cursor-pointer bg-r-blue-light-1 w-14 h-14 ml-[8px] flex items-center justify-center padding-2 rounded-[2px]"
        onClick={() => {
          if (!utf8Data) return;

          onViewInputData?.({
            parsedInputData: utf8Data,
          });
        }}
      >
        <img src={IconInputData} className="w-[100%] h-[100%] block" />
      </span>
    </Tooltip>
  );
}

function ViewMessageTriggerForContract({
  contractAddress,
  userAddress,
  txInputData,
  chainItem,
  onViewInputData,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  contractAddress: string;
} & ViewMessageTriggerProps) {
  const {
    explain,
    isLoadingExplain,
    loadingExplainError,
    contractCallPlainText,
  } = useParseContractAddress({
    contractAddress,
    chain: chainItem,
    inputDataHex: txInputData
      ? formatTxInputDataOnERC20(txInputData).hexData
      : null,
    userAddress,
  });

  const { t } = useTranslation();

  return (
    <>
      {isLoadingExplain && (
        <Skeleton.Button active className="ml-[8px] w-14 h-14 inline-block" />
      )}
      {!isLoadingExplain && explain?.abi && (
        <Tooltip
          overlayClassName="rectangle J_tipInputData text-r-neutral-title-2 text-[12px]"
          placement="topLeft"
          arrowPointAtCenter
          // The transaction includes a message
          title={
            loadingExplainError
              ? t('page.transactions.txHistory.parseInputDataError')
              : t('page.transactions.txHistory.tipInputData')
          }
        >
          <span
            {...props}
            className="cursor-pointer bg-r-blue-light-1 w-14 h-14 ml-[8px] flex items-center justify-center padding-2 rounded-[2px]"
            onClick={() => {
              if (loadingExplainError) return;

              onViewInputData?.({
                parsedInputData: contractCallPlainText,
              });
            }}
          >
            <img src={IconInputData} className="w-[100%] h-[100%] block" />
          </span>
        </Tooltip>
      )}
    </>
  );
}

function isTokenItemNative(tokenItem?: TokenItem | null) {
  if (!tokenItem) return false;

  const chainItem = findChainByServerID(tokenItem.chain);
  return !!chainItem?.nativeTokenSymbol;
}

/**
 * @description parse tx from client, request remote info(server & chain api)
 */
function useClientParseTx({
  chainItem,
  data,
  tokenDict,
}: {
  chainItem: Chain | null;
  data: TxDisplayItem | TxHistoryItem;
  tokenDict: Record<string, TokenItem>;
}) {
  const wallet = useWallet();

  const [txInputData, setTxInputData] = React.useState<string | null>(null);
  const isTxNeedInputData = useMemo(() => {
    return (
      !data.is_scam &&
      !!chainItem?.nativeTokenSymbol &&
      data.cate_id &&
      ['send', 'receive'].includes(data.cate_id) &&
      ((!data.receives.length && !data.receives.length) ||
        data.receives?.filter((v) => isTokenItemNative(tokenDict[v.token_id]))
          .length === 1 ||
        data.sends?.filter((v) => isTokenItemNative(tokenDict[v.token_id]))
          .length === 1)
    );
  }, [data, chainItem?.nativeTokenSymbol, tokenDict]);

  useAsync(async () => {
    if (!isTxNeedInputData || !chainItem) {
      setTxInputData(null);
      return;
    }

    try {
      const hashDetail = await wallet.requestETHRpc(
        {
          method: 'eth_getTransactionByHash',
          params: [data.id],
        },
        chainItem.serverId
      );

      if (hashDetail?.input?.length > '0x0'.length) {
        setTxInputData(hashDetail?.input);
      } else {
        setTxInputData(null);
      }
    } catch (err) {
      setTxInputData(null);
    }
  }, [isTxNeedInputData, data.id, chainItem?.serverId]);
}

type HistoryItemProps = {
  data: TxDisplayItem | TxHistoryItem;
  onViewInputData?: (ctx: HistoryItemActionContext) => void;
} & Pick<TxDisplayItem, 'cateDict' | 'projectDict' | 'tokenDict'>;

export const HistoryItem = ({
  data,
  cateDict,
  projectDict,
  tokenDict,
  onViewInputData,
}: HistoryItemProps) => {
  const chainItem = getChain(data.chain);
  const isFailed = data.tx?.status === 0;
  const isScam = data.is_scam;

  const { addressType } = useCheckAddressType(data.tx?.to_addr, chainItem);

  const { t } = useTranslation();
  const wallet = useWallet();
  const account = useRabbySelector((state) => state.account.currentAccount);

  if (!chainItem) {
    return null;
  }

  return (
    <div
      className={clsx('txs-history-card', (isScam || isFailed) && 'is-gray')}
    >
      <div className="txs-history-card-header">
        {isScam && <div className="tag-scam">{t('global.scamTx')}</div>}
        <div className="txs-history-card-header-inner text-12">
          <div className="time">{sinceTime(data.time_at)}</div>
          <div className="txs-history-card-header-right flex items-center justify-end flex-shrink-1 w-[100%]">
            <TxId chain={data.chain} id={data.id} />
            {/* {addressType === AddressType.CONTRACT && !data.is_scam && (
              <ViewMessageTriggerForContract
                contractAddress={data.other_addr}
                userAddress={account?.address || ''}
                txInputData={data.tx?.message || ''}
                chainItem={chainItem}
                onViewInputData={onViewInputData}
              />
            )} */}
            {addressType === AddressType.EOA && !data.is_scam && (
              <ViewMessageTriggerForEoa
                userAddress={account?.address || ''}
                txInputData={data.tx?.message || ''}
                chainItem={chainItem}
                onViewInputData={onViewInputData}
              />
            )}
          </div>
        </div>
      </div>
      <div className="txs-history-card-body">
        <TxInterAddressExplain
          data={data}
          projectDict={projectDict}
          tokenDict={tokenDict}
          cateDict={cateDict}
        />
        <TokenChange data={data} tokenDict={tokenDict} />
      </div>
      {(data.tx && data.tx?.eth_gas_fee) || isFailed ? (
        <div className="txs-history-card-footer">
          {data.tx && data.tx?.eth_gas_fee ? (
            <div>
              {t('global.gas')}:{' '}
              {numberWithCommasIsLtOne(data.tx?.eth_gas_fee, 2)}{' '}
              {chainItem?.nativeTokenSymbol} ($
              {numberWithCommasIsLtOne(data.tx?.usd_gas_fee ?? 0, 2)})
            </div>
          ) : null}
          {isFailed && (
            <span className="tx-status is-failed">{t('global.failed')}</span>
          )}
        </div>
      ) : null}
    </div>
  );
};
