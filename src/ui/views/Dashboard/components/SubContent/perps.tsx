import { INNER_DAPP_IDS, INNER_DAPP_LIST } from '@/constant/dappIframe';
import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep, useWallet } from '@/ui/utils';
import { loadAppChainList } from '@/ui/utils/portfolio/utils';
import { usePerpsHomePnl } from '@/ui/views/Perps/hooks/usePerpsHomePnl';
import { getOriginFromUrl } from '@/utils';
import { Skeleton } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useAsync } from 'react-use';

export const PerpsSubContent = () => {
  const perpsId = useRabbySelector((s) => s.innerDappFrame.perps);
  if (perpsId === 'hyperliquid') {
    return <HyperliquidHeader />;
  }
  if (perpsId === 'lighter') {
    return <LighterHeader />;
  }
  return null;
};

const HyperliquidHeader = () => {
  const { perpsPositionInfo, isFetching, positionPnl } = usePerpsHomePnl();
  return isFetching ? (
    <div className="absolute bottom-[6px] text-[11px] font-medium">
      <Skeleton.Button
        active={true}
        className="h-[10px] block rounded-[2px]"
        style={{ width: 42 }}
      />
    </div>
  ) : perpsPositionInfo?.assetPositions?.length ? (
    <div
      className={clsx(
        'absolute bottom-[6px] text-[11px] leading-[13px] font-medium',
        positionPnl && positionPnl > 0
          ? 'text-r-green-default'
          : 'text-r-red-default'
      )}
    >
      {positionPnl && positionPnl >= 0 ? '+' : '-'}$
      {splitNumberByStep(Math.abs(positionPnl || 0).toFixed(2))}
    </div>
  ) : +(perpsPositionInfo?.marginSummary?.accountValue || '') ? (
    <div
      className={clsx(
        'absolute bottom-[6px] text-[11px] leading-[13px] font-medium text-r-neutral-foot'
      )}
    >
      {formatUsdValue(perpsPositionInfo?.marginSummary.accountValue || 0)}
    </div>
  ) : null;
};

const LighterHeader = () => {
  const wallet = useWallet();

  const account = useRabbySelector((s) => {
    const url = INNER_DAPP_LIST.PERPS.find(
      (e) => e.id === INNER_DAPP_IDS.LIGHTER
    )?.url;
    if (url?.startsWith('https://')) {
      const LighterOrigin = getOriginFromUrl(url || '');
      return s.innerDappFrame.innerDappAccounts[LighterOrigin];
    }
    return undefined;
  });
  const { value } = useAsync(async () => {
    if (account?.address) {
      const result = loadAppChainList(account?.address, wallet);
      return result;
    }
    return;
  }, [account?.address]);

  const { lighter, totalUsd } = React.useMemo(() => {
    const lighter = value?.apps.find((e) => e.id === INNER_DAPP_IDS.LIGHTER);
    return {
      lighter,
      totalUsd: lighter?.portfolio_item_list?.reduce((pre, now) => {
        return pre + (now?.stats?.net_usd_value || 0);
      }, 0),
    };
  }, [value]);

  if (!account || !lighter) {
    return null;
  }

  return (
    <div
      className={clsx(
        'absolute bottom-[6px] text-[11px] leading-[13px] font-medium text-r-neutral-foot'
      )}
    >
      {formatUsdValue(totalUsd || 0)}
    </div>
  );
};
