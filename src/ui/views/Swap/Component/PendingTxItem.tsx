import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  forwardRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useInterval, useMemoizedFn } from 'ahooks';
import clsx from 'clsx';
import { findChain } from '@/utils/chain';
import { formatTokenAmount } from '@/ui/utils/number';
import { getTokenSymbol } from '@/ui/utils/token';
import { useWallet } from '@/ui/utils';
import IconUnknown from '@/ui/assets/token-default.svg';
import { useHistory } from 'react-router-dom';
import { transactionHistoryService } from '@/background/service';
import { useRabbySelector } from '@/ui/store';
import {
  SvgPendingSpin,
  SvgIcPending,
  SvgIcSuccess,
  SvgIcWarning,
} from 'ui/assets';

import type {
  SwapTxHistoryItem,
  SendTxHistoryItem,
  BridgeTxHistoryItem,
} from '@/background/service/transactionHistory';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Image } from 'antd';
import { BridgeHistory, TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import NFTAvatar from '../../Dashboard/components/NFT/NFTAvatar';

type PendingTxData =
  | SwapTxHistoryItem
  | SendTxHistoryItem
  | BridgeTxHistoryItem;

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'pending') {
    return (
      <div className="w-16 h-16 rounded-full flex items-center justify-center">
        <SvgIcPending
          className="w-16 h-16 animate-spin text-r-orange-default"
          style={{
            animation: 'spin 1.5s linear infinite',
          }}
        />
      </div>
    );
  }
  if (status === 'failed') {
    return (
      <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center">
        <SvgIcWarning className="w-16 h-16 text-r-red-default" />
      </div>
    );
  }

  return (
    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
      <SvgIcSuccess className="w-16 h-16 text-r-green-default" />
    </div>
  );
};

const TokenWithChain = ({ token, chain }: { token: string; chain: string }) => {
  const chainItem = findChain({ serverId: chain }) || null;

  return (
    <div className="relative w-20 h-20">
      <Image
        className="w-20 h-20 rounded-full"
        src={token}
        fallback={IconUnknown}
        preview={false}
      />
      <TooltipWithMagnetArrow
        title={chainItem?.name}
        className="rectangle w-[max-content]"
      >
        <img
          className="w-12 h-12 absolute right-[-4px] bottom-[-4px] rounded-full"
          src={chainItem?.logo || IconUnknown}
          alt={chainItem?.name}
        />
      </TooltipWithMagnetArrow>
    </div>
  );
};

// const mockData = {
//   status: 'failed',
//   hash: '0x1234567890',
//   chainId: 78,
//   address: '0x1234567890',
//   slippage: 0.005,
//   fromAmount: 0.025786,
//   toAmount: 0.025786,
//   dexId: '0x1234567890',
//   createdAt: 1716800531,
//   fromChainId: 1,
//   fromToken: {
//     amount: 0.025786,
//     cex_ids: [],
//     chain: 'taiko',
//     credit_score: 98155.1364332469,
//     decimals: 6,
//     display_symbol: null,
//     id: '0x07d83526730c7438048d55a4fc0b850e2aab6f0b',
//     is_core: true,
//     is_verified: true,
//     is_wallet: true,
//     logo_url:
//       'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f2ea855dc29069b38818.png',
//     name: 'USD Coin',
//     optimized_symbol: 'USDC',
//     price: 0.9998000399920016,
//     price_24h_change: -0.00019996000799837876,
//     protocol_id: '',
//     symbol: 'USDC',
//     time_at: 1716800531,
//   },
//   amount: 123.456,
//   toToken: {
//     amount: 0.025786,
//     cex_ids: [],
//     chain: 'taiko',
//     credit_score: 98155.1364332469,
//     decimals: 6,
//     display_symbol: null,
//     id: '0x07d83526730c7438048d55a4fc0b850e2aab6f0b',
//     is_core: true,
//     is_verified: true,
//     is_wallet: true,
//     logo_url:
//       'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f2ea855dc29069b38818.png',
//     name: 'USD Coin',
//     optimized_symbol: 'USDC',
//     price: 0.9998000399920016,
//     price_24h_change: -0.00019996000799837876,
//     protocol_id: '',
//     symbol: 'USDC',
//     time_at: 1716800531,
//   },
//   token: {
//     amount: 0.025786,
//     cex_ids: [],
//     chain: 'taiko',
//     credit_score: 98155.1364332469,
//     decimals: 6,
//     display_symbol: null,
//     id: '0x07d83526730c7438048d55a4fc0b850e2aab6f0b',
//     is_core: true,
//     is_verified: true,
//     is_wallet: true,
//     logo_url:
//       'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f2ea855dc29069b38818.png',
//     name: 'USD Coin',
//     optimized_symbol: 'USDC',
//     price: 0.9998000399920016,
//     price_24h_change: -0.00019996000799837876,
//     protocol_id: '',
//     symbol: 'USDC',
//     time_at: 1716800531,
//   },
// } as SwapTxHistoryItem;

export const PendingTxItem = forwardRef<
  { fetchHistory: () => void },
  {
    type: 'send' | 'swap' | 'bridge';
    bridgeHistoryList?: BridgeHistory[];
    openBridgeHistory?: () => void;
  }
>(({ type, bridgeHistoryList, openBridgeHistory }, ref) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const history = useHistory();
  const [data, setData] = useState<PendingTxData | null>(null);
  const { userAddress } = useRabbySelector((state) => ({
    userAddress: state.account.currentAccount?.address || '',
  }));

  const fetchHistory = useCallback(async () => {
    if (!userAddress) return;
    const historyData = await wallet.getRecentPendingTxHistory(
      userAddress,
      type
    );
    setData(historyData);
  }, [type, userAddress]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const fetchRefreshLocalData = useMemoizedFn(
    async (data: PendingTxData, type: 'swap' | 'send' | 'bridge') => {
      if (data.status !== 'pending') {
        // has done
        return;
      }

      const address = data.address;
      const chainId =
        'chainId' in data
          ? data.chainId
          : 'fromChainId' in data
          ? data.fromChainId
          : null;
      const hash = data.hash;
      const newData = await wallet.getRecentTxHistory(
        address,
        hash,
        chainId!,
        type
      );

      if (newData?.status !== 'pending') {
        return newData;
      }
    }
  );

  useInterval(async () => {
    if (data) {
      const refreshTx = await fetchRefreshLocalData(data, type);
      if (refreshTx) {
        setData(refreshTx);
      }
    }
  }, 1000);

  useEffect(() => {
    if (
      bridgeHistoryList &&
      bridgeHistoryList?.length > 0 &&
      type === 'bridge'
    ) {
      const recentlyTxHash = data?.hash;
      if (
        recentlyTxHash &&
        'fromChainId' in data && // only bridge logic
        data.status !== 'allSuccess'
      ) {
        const findTx = bridgeHistoryList.find(
          (item) => item.from_tx?.tx_id === recentlyTxHash
        );
        if (!findTx) {
          // no find tx, default set this tx failed
          wallet.completeBridgeTxHistory(
            recentlyTxHash,
            data?.fromChainId,
            'failed'
          );
          return;
        }
        if (findTx && findTx.status === 'completed' && data) {
          setData({
            ...data,
            status: 'allSuccess',
            completedAt: Date.now(),
          });
          wallet.completeBridgeTxHistory(
            recentlyTxHash,
            data.fromChainId,
            'allSuccess'
          );
        }
      }
    }
  }, [bridgeHistoryList, data, type, wallet]);

  const isPending =
    data?.status === 'pending' || data?.status === 'fromSuccess';
  const isFailed = data?.status === 'failed';
  const isSuccess = data?.status === 'success' || data?.status === 'allSuccess';

  const handlePress = useMemoizedFn(async () => {
    if (!isPending) {
      setData(null);
    }
    if (type === 'bridge' && openBridgeHistory) {
      openBridgeHistory();
    } else {
      history.push('/activities');
    }
  });

  const sendTitleTextStr = useMemo(() => {
    if (type === 'send' && data) {
      const sendData = data as SendTxHistoryItem;
      const sendAmount = formatTokenAmount(sendData?.amount);
      if ((data as SendTxHistoryItem).isNft) {
        return `-${sendAmount} NFT`;
      }

      return `-${sendAmount} ${getTokenSymbol(sendData?.token as TokenItem)}`;
    }
    return '';
  }, [type, data]);

  const statusText = useMemo(() => {
    if (isPending) {
      return t('page.transactions.detail.Pending');
    }
    if (isFailed) {
      return t('page.transactions.detail.Failed');
    }
    return t('page.transactions.detail.Succeeded');
  }, [isPending, isFailed, t]);

  const statusClassName = useMemo(() => {
    if (isPending) {
      return 'text-r-orange-default';
    }
    if (isFailed) {
      return 'text-r-red-default';
    }
    return 'text-r-green-default';
  }, [isPending, isFailed]);

  useImperativeHandle(ref, () => ({
    fetchHistory: () => {
      fetchHistory();
    },
  }));

  if (!data) {
    return null;
  }

  const sendToken = (type === 'send' && !(data as SendTxHistoryItem).isNft
    ? (data as SendTxHistoryItem)?.token
    : undefined) as TokenItem | undefined;

  const sendChainItem =
    type === 'send'
      ? findChain({
          serverId: (data as SendTxHistoryItem)?.token?.chain || '',
        })
      : undefined;

  return (
    <div>
      <div
        className={clsx(
          'flex items-center justify-between cursor-pointer rounded-[8px] px-[16px] py-[14px]',
          'hover:bg-blue-light hover:bg-opacity-[0.1] hover:border-rabby-blue-default border border-transparent',
          'bg-r-neutral-card-1'
        )}
        onClick={handlePress}
      >
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-6">
            {type === 'send' ? (
              <>
                {(data as SendTxHistoryItem)?.isNft ? (
                  <div className="relative w-20 h-20">
                    <NFTAvatar
                      content={(data as SendTxHistoryItem)?.token?.content}
                      type={(data as SendTxHistoryItem)?.token?.content_type}
                      className="w-[20px] h-[20px]"
                    />
                    <TooltipWithMagnetArrow
                      title={sendChainItem?.name}
                      className="rectangle w-[max-content]"
                    >
                      <img
                        className="w-12 h-12 absolute right-[-4px] bottom-[-4px] rounded-full"
                        src={sendChainItem?.logo || IconUnknown}
                        alt={sendChainItem?.name}
                      />
                    </TooltipWithMagnetArrow>
                  </div>
                ) : (
                  <TokenWithChain
                    token={sendToken?.logo_url || ''}
                    chain={(data as SendTxHistoryItem)?.token?.chain || ''}
                  />
                )}
                <span className="text-15 font-medium text-r-neutral-title-1">
                  {sendTitleTextStr}
                </span>
              </>
            ) : type === 'swap' ? (
              <>
                <TokenWithChain
                  token={(data as SwapTxHistoryItem)?.fromToken?.logo_url}
                  chain={(data as SwapTxHistoryItem)?.fromToken?.chain || ''}
                />
                <span className="text-15 font-medium text-r-neutral-title-1">
                  {getTokenSymbol((data as SwapTxHistoryItem)?.fromToken)}
                </span>
                <span className="text-15 font-medium text-r-neutral-foot mx-2">
                  →
                </span>
                <TokenWithChain
                  token={(data as SwapTxHistoryItem)?.toToken?.logo_url}
                  chain={(data as SwapTxHistoryItem)?.toToken?.chain || ''}
                />
                <span className="text-15 font-medium text-r-neutral-title-1">
                  {getTokenSymbol((data as SwapTxHistoryItem)?.toToken)}
                </span>
              </>
            ) : (
              <>
                <TokenWithChain
                  token={(data as BridgeTxHistoryItem)?.fromToken?.logo_url}
                  chain={(data as BridgeTxHistoryItem)?.fromToken?.chain || ''}
                />
                <span className="text-15 font-medium text-r-neutral-title-1">
                  {getTokenSymbol((data as BridgeTxHistoryItem)?.fromToken)}
                </span>
                <span className="text-15 font-medium text-r-neutral-foot mx-2">
                  →
                </span>
                <TokenWithChain
                  token={(data as BridgeTxHistoryItem)?.toToken?.logo_url}
                  chain={(data as BridgeTxHistoryItem)?.toToken?.chain || ''}
                />
                <span className="text-15 font-medium text-r-neutral-title-1">
                  {getTokenSymbol((data as BridgeTxHistoryItem)?.toToken)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <StatusIcon status={data.status} />
          <span className={clsx('text-15 font-medium', statusClassName)}>
            {statusText}
          </span>
        </div>
      </div>
    </div>
  );
});
