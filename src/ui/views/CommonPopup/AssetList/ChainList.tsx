import { useCommonPopupView } from '@/ui/utils';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { ChainItem, ChainItemType, sortChainWithValueDesc } from './ChainItem';
import { DisplayChainWithWhiteLogo } from '@/ui/hooks/useCurrentBalance';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';

function shouldChainRevealed(chainItem: ChainItemType) {
  return chainItem.percent >= 1 || chainItem.usd_value >= 1000;
}

export const ChainList = ({
  onChange,
  isTestnet = false,
}: {
  onChange(id: string | null): void;
  isTestnet?: boolean;
}) => {
  const { data, visible } = useCommonPopupView();
  const chainList = isTestnet
    ? (data?.matteredTestnetChainBalances as DisplayChainWithWhiteLogo[]) ?? []
    : (data?.matteredChainBalances as DisplayChainWithWhiteLogo[]) ?? [];
  const balance = isTestnet
    ? (data?.testnetBalance as number) ?? 0
    : (data?.balance as number) ?? 0;
  const balanceLoading = (data?.balanceLoading as boolean) ?? false;
  const [showMore, setShowMore] = React.useState(false);
  const [activeChainId, setActiveChainId] = React.useState<string | null>(null);
  const { t } = useTranslation();

  const handleSelectChain = (id?: string) => {
    if (!id || activeChainId === id) {
      setActiveChainId(null);
      onChange(null);
    } else {
      setActiveChainId(id);
      onChange(id);
    }
  };

  const { chainsToReveal, chainsToHide } = React.useMemo(() => {
    const res = {
      allItems: [] as ChainItemType[],
      chainsToReveal: [] as ChainItemType[],
      chainsToHide: [] as ChainItemType[],
    };

    const chainCount = chainList.length;
    chainList.forEach((item) => {
      const chainItem: ChainItemType = {
        ...item,
        percent: (item.usd_value / balance) * 100,
      };
      res.allItems.push(chainItem);

      if (chainCount <= 6 || shouldChainRevealed(chainItem)) {
        res.chainsToReveal.push(chainItem);
      } else {
        res.chainsToHide.push(chainItem);
      }
    });

    if (res.chainsToHide.length <= 2) {
      res.chainsToReveal = [...res.allItems];
      res.chainsToHide = [];
    }

    res.chainsToReveal.sort(sortChainWithValueDesc);
    res.chainsToHide.sort(sortChainWithValueDesc);

    return res;
  }, [chainList, balance]);

  React.useEffect(() => {
    if (!visible) {
      setShowMore(false);
      handleSelectChain();
    }
  }, [visible]);

  const moreLen = chainsToHide.length;

  if (balanceLoading) {
    return (
      <Skeleton.Input
        active
        className="block rounded-[6px] w-[360px] h-[68px] bg-r-neutral-card-2"
      />
    );
  }

  if (balance <= 0) {
    return null;
  }

  return (
    <div
      className={clsx(
        'bg-r-neutral-card-2 rounded-[6px] p-[12px]',
        'flex gap-12 flex-wrap'
      )}
    >
      {chainsToReveal.map((item) => (
        <ChainItem
          inactive={activeChainId !== null && activeChainId !== item.id}
          key={item.id}
          item={item}
          onClick={() => {
            handleSelectChain(item.id);
          }}
        />
      ))}
      {showMore ? (
        chainsToHide.map((item) => (
          <ChainItem
            onClick={() => {
              handleSelectChain(item.id);
            }}
            inactive={activeChainId !== null && activeChainId !== item.id}
            key={item.id}
            item={item}
          />
        ))
      ) : (
        <div
          className={clsx(
            'cursor-pointer text-12 underline text-r-neutral-foot leading-[20px]',
            {
              hidden: moreLen === 0,
            }
          )}
          onClick={() => {
            setShowMore(true);
          }}
        >
          {moreLen > 1
            ? t('page.dashboard.assets.unfoldChainPlural', { moreLen })
            : t('page.dashboard.assets.unfoldChain')}
        </div>
      )}
    </div>
  );
};
