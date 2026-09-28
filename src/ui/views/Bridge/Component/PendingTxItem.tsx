import React, { useCallback, useEffect, useState } from 'react';
import { useInterval, useMemoizedFn } from 'ahooks';
import { findChain } from '@/utils/chain';
import { getTokenSymbol } from '@/ui/utils/token';
import { useWallet } from '@/ui/utils';
import IconUnknown from '@/ui/assets/token-default.svg';
import { useRabbySelector } from '@/ui/store';
import type { BridgeTxHistoryItem } from '@/background/service/transactionHistory';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Image } from 'antd';
import { BridgeHistory } from '@rabby-wallet/rabby-api/dist/types';
import { DrawerProps } from 'antd';
import { Popup } from '@/ui/component';
import eventBus from '@/eventBus';
import { EVENTS } from '@/constant';
import { BridgeProgressCard } from './BridgeProgressCard';
import { BridgeStatusPopup } from './BridgeStatusPopup';
import {
  BRIDGE_PENDING_HISTORY_QUERY,
  isBridgePendingExpired,
  resolveBridgePendingFromHistoryList,
} from '../utils/pendingStatus';

type PendingTxData = BridgeTxHistoryItem;

const TokenWithChain = ({ token, chain }: { token: string; chain: string }) => {
  const chainItem = findChain({ serverId: chain }) || null;

  return (
    <div className="relative h-20 w-20 shrink-0">
      <Image
        className="block h-20 w-20 rounded-full object-cover"
        src={token}
        fallback={IconUnknown}
        preview={false}
        width={20}
        height={20}
      />
      <TooltipWithMagnetArrow
        title={chainItem?.name}
        className="rectangle w-max"
      >
        <img
          className="absolute left-[10px] top-[-2px] h-12 w-12 rounded-full object-cover"
          src={chainItem?.logo || IconUnknown}
          alt={chainItem?.name}
          width={12}
          height={12}
        />
      </TooltipWithMagnetArrow>
    </div>
  );
};

export const BridgePendingTxItem = ({
  getContainer,
  onDisplayChange,
}: {
  getContainer?: DrawerProps['getContainer'];
  onDisplayChange?: (visible: boolean) => void;
}) => {
  const type = 'bridge';
  const wallet = useWallet();
  const [detailVisible, setDetailVisible] = useState(false);
  const [data, setData] = useState<PendingTxData | null>(null);
  const { userAddress } = useRabbySelector((state) => ({
    userAddress: state.account.currentAccount?.address || '',
  }));

  useEffect(() => {
    onDisplayChange?.(!!data);
    return () => onDisplayChange?.(false);
  }, [!!data, onDisplayChange]);

  const applyHistoryList = useMemoizedFn(
    (
      local: BridgeTxHistoryItem,
      list: BridgeHistory[] | undefined,
      updateHash = local.hash
    ) => {
      const resolution = resolveBridgePendingFromHistoryList(local, list);
      if (resolution.kind === 'hide-failed') {
        wallet.completeBridgeTxHistory(
          updateHash,
          resolution.fromChainId,
          'failed'
        );
        setData(null);
        return;
      }
      if (resolution.kind === 'complete') {
        setData(resolution.local);
        wallet.completeBridgeTxHistory(
          updateHash,
          resolution.fromChainId,
          resolution.status,
          resolution.item
        );
        return;
      }
      if (resolution.kind === 'sync') {
        setData(resolution.local);
      }
    }
  );

  const fetchHistory = useCallback(async () => {
    if (!userAddress) return;
    const historyData = (await wallet.getRecentPendingTxHistory(
      userAddress,
      'bridge'
    )) as BridgeTxHistoryItem;

    // tx create time is more than one day, set this tx failed and no show in loading pendingTxItem
    if (isBridgePendingExpired(historyData?.createdAt)) {
      wallet.completeBridgeTxHistory(
        historyData.hash,
        historyData.fromChainId!,
        'failed'
      );
      return;
    }

    setData(historyData);
    if (
      historyData &&
      historyData.hash &&
      (historyData.status === 'pending' || historyData.status === 'fromSuccess')
    ) {
      const res = await wallet.openapi.getBridgeHistoryList({
        user_addr: userAddress,
        ...BRIDGE_PENDING_HISTORY_QUERY,
      });
      if (res.history_list && res.history_list?.length > 0) {
        applyHistoryList(historyData, res.history_list);
      }
    }
  }, [type, userAddress]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const fetchRefreshLocalData = useMemoizedFn(async (data: PendingTxData) => {
    if (data.status !== 'pending') {
      // has done
      return;
    }

    const address = data.address;
    const chainId = data.fromChainId;
    const hash = data.hash;
    const newData = await wallet.getRecentTxHistory(
      address,
      hash,
      chainId!,
      'bridge'
    );

    if (newData?.status !== 'pending') {
      return newData;
    }
  });

  const handleBridgeHistoryUpdate = useMemoizedFn(
    (bridgeHistoryList: BridgeHistory[]) => {
      if (
        !data?.hash ||
        (data.status !== 'pending' && data.status !== 'fromSuccess')
      ) {
        return;
      }

      applyHistoryList(
        data,
        bridgeHistoryList,
        data.acceleratedHash || data.hash
      );
    }
  );

  useEffect(() => {
    const listener = (list: BridgeHistory[]) => {
      handleBridgeHistoryUpdate(list);
    };
    eventBus.addEventListener(EVENTS.BRIDGE_HISTORY_UPDATED, listener);
    return () => {
      eventBus.removeEventListener(EVENTS.BRIDGE_HISTORY_UPDATED, listener);
    };
  }, []);

  // 预估不超过 5 秒时，源链完成后的前 5 秒不展示 Still Bridging，避免短文案一闪而过。
  // 轮询从 3 秒改成 2.5 秒，这样这 5 秒内除了进入页面时的首次请求，还能再查两次，尽量在文案出现前拿到结果。
  useInterval(async () => {
    const recentlyTxHash = data?.hash;
    if (
      recentlyTxHash &&
      (data.status === 'pending' || data.status === 'fromSuccess')
    ) {
      const res = await wallet.openapi.getBridgeHistoryList({
        user_addr: userAddress,
        ...BRIDGE_PENDING_HISTORY_QUERY,
      });
      if (res.history_list?.length) {
        handleBridgeHistoryUpdate(res.history_list);
      }
    }
  }, 2.5 * 1000);

  useInterval(async () => {
    if (data?.status === 'pending' || data?.status === 'fromSuccess') {
      const refreshTx = await fetchRefreshLocalData(data);
      if (refreshTx) {
        setData(refreshTx as PendingTxData);
      }
    }
  }, 1000);

  const handlePress = useMemoizedFn(async () => {
    setDetailVisible(true);
  });

  if (!data) {
    return null;
  }

  return (
    <div>
      <BridgeProgressCard data={data} onOpen={handlePress}>
        <div className="flex items-center gap-[8px]">
          <div className="flex items-center gap-[6px]">
            <TokenWithChain
              token={data.fromToken?.logo_url}
              chain={data.fromToken?.chain || ''}
            />
            <span className="text-15 font-medium text-r-neutral-title-1">
              {getTokenSymbol(data.fromToken)}
            </span>
          </div>
          <span className="text-15 font-medium text-r-neutral-foot">→</span>
          <div className="flex items-center gap-[6px]">
            <TokenWithChain
              token={data.toToken?.logo_url}
              chain={data.toToken?.chain || ''}
            />
            <span className="text-15 font-medium text-r-neutral-title-1">
              {getTokenSymbol(data.toToken)}
            </span>
          </div>
        </div>
      </BridgeProgressCard>
      <Popup
        placement="bottom"
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        closable={true}
        contentWrapperStyle={{
          height: '440px',
        }}
        destroyOnClose
        bodyStyle={{
          padding: 0,
          height: '440px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'var(--r-neutral-bg2, #F2F4F7)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
        }}
        isSupportDarkMode
        isNew
        getContainer={getContainer}
      >
        {data && (
          <BridgeStatusPopup
            data={data}
            onClose={() => setDetailVisible(false)}
          />
        )}
      </Popup>
    </div>
  );
};
