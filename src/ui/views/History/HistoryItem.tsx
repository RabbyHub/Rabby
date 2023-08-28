import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
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

export type HistoryItemActionContext = {
  targetAddressType: AddressType;
  targetAddress: string;
  chain: Chain | null;
  inputDataHex: any;
  parsedInputData: string;
  // data: TxDisplayItem | TxHistoryItem;
};

function ViewMessageTriggerForEoa({
  eoaAddress,
  userAddress,
  inputDataHex,
  chainItem,
  onViewInputData,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  eoaAddress: string;
  userAddress: string;
  inputDataHex: string | null;
  chainItem: Chain;
  onViewInputData?: (ctx: HistoryItemActionContext) => void;
}) {
  const { t } = useTranslation();

  const utf8Data = useMemo(() => {
    if (!inputDataHex) return null;

    return formatTxInputDataOnERC20(inputDataHex).utf8Data;
  }, [inputDataHex]);

  if (!utf8Data) return null;

  return (
    <Tooltip
      overlayClassName="rectangle J_tipInputData text-r-neutral-title-2 text-[12px]"
      placement="topLeft"
      // The transaction includes a message
      title={t('page.transactions.txHistory.tipInputData')}
    >
      <span
        {...props}
        className="cursor-pointer bg-r-blue-light-1 w-14 h-14 ml-[8px] flex items-center justify-center padding-2 rounded-[2px]"
        onClick={() => {
          if (!utf8Data) return;

          onViewInputData?.({
            targetAddressType: AddressType.CONTRACT,
            targetAddress: eoaAddress,
            inputDataHex,
            parsedInputData: utf8Data,
            chain: chainItem || null,
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
  inputDataHex,
  chainItem,
  onViewInputData,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  contractAddress: string;
  userAddress: string;
  inputDataHex: string | null;
  chainItem: Chain;
  onViewInputData?: (ctx: HistoryItemActionContext) => void;
}) {
  const {
    explain,
    isLoadingExplain,
    loadingExplainError,
    contractCallPlainText,
  } = useParseContractAddress({
    contractAddress,
    chain: chainItem,
    inputDataHex,
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
                targetAddressType: AddressType.CONTRACT,
                targetAddress: contractAddress,
                inputDataHex,
                parsedInputData: contractCallPlainText,
                chain: chainItem || null,
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

  const { addressType } = useCheckAddressType(data.other_addr, chainItem);

  const { t } = useTranslation();
  const wallet = useWallet();
  const account = useRabbySelector((state) => state.account.currentAccount);

  const [txInputData, setTxInputData] = React.useState<string | null>(null);
  useAsync(async () => {
    if (!chainItem) return null;

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
  }, [data.id, chainItem?.serverId]);

  if (!chainItem) {
    return null;
  }

  return (
    <div
      className={clsx('txs-history-card', (isScam || isFailed) && 'is-gray')}
    >
      <div className="txs-history-card-header">
        {isScam && <div className="tag-scam">{t('global.scamTx')}</div>}
        <div className="txs-history-card-header-inner">
          <div className="time">{sinceTime(data.time_at)}</div>
          <div className="txs-history-card-header-right flex items-center justify-end flex-shrink-1 w-[100%]">
            <TxId chain={data.chain} id={data.id} />
            {addressType === AddressType.CONTRACT && (
              <ViewMessageTriggerForContract
                contractAddress={data.other_addr}
                userAddress={account?.address || ''}
                inputDataHex={txInputData}
                chainItem={chainItem}
                onViewInputData={onViewInputData}
              />
            )}
            {addressType === AddressType.EOA && (
              <ViewMessageTriggerForEoa
                eoaAddress={data.other_addr}
                userAddress={account?.address || ''}
                inputDataHex={txInputData}
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
