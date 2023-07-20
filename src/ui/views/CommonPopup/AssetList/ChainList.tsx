import { useCommonPopupView } from '@/ui/utils';
import clsx from 'clsx';
import React, { useEffect } from 'react';
import { ChainItem, ChainItemType } from './ChainItem';
import { DisplayChainWithWhiteLogo } from '@/ui/hooks/useCurrentBalance';
import { Skeleton } from 'antd';

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
  const [currentChainList, setCurrentChainList] = React.useState<
    ChainItemType[]
  >([]);
  const [moreChainList, setMoreChainList] = React.useState<ChainItemType[]>([]);
  const [showMore, setShowMore] = React.useState(false);
  const [activeChainId, setActiveChainId] = React.useState<string | null>(null);

  const handleSelectChain = (id?: string) => {
    if (!id || activeChainId === id) {
      setActiveChainId(null);
      onChange(null);
    } else {
      setActiveChainId(id);
      onChange(id);
    }
  };

  React.useEffect(() => {
    const list = chainList.map((item) => {
      return {
        ...item,
        percent: (item.usd_value / balance) * 100,
      };
    });
    setCurrentChainList(list.filter((item) => item.percent >= 1));
    setMoreChainList(list.filter((item) => item.percent < 1));
  }, [chainList, balance]);

  React.useEffect(() => {
    if (!visible) {
      setShowMore(false);
      handleSelectChain();
    }
  }, [visible]);

  const moreLen = moreChainList.length;

  if (balanceLoading) {
    return (
      <Skeleton.Input
        active
        className="block rounded-[6px] w-[360px] h-[68px] bg-gray-bg"
      />
    );
  }

  if (balance <= 0) {
    return null;
  }

  return (
    <div
      className={clsx(
        'bg-gray-bg2 rounded-[6px] p-[12px]',
        'flex gap-12 flex-wrap'
      )}
    >
      {currentChainList.map((item) => (
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
        moreChainList.map((item) => (
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
            'cursor-pointer text-12 underline text-black leading-[20px]',
            {
              hidden: moreLen === 0,
            }
          )}
          onClick={() => {
            setShowMore(true);
          }}
        >
          Unfold {moreLen} chain{moreLen > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};
