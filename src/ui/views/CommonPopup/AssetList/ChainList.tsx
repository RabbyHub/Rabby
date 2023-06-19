import { useCommonPopupView } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';
import { ChainItem, ChainItemType } from './ChainItem';
import { DisplayChainWithWhiteLogo } from '@/ui/hooks/useCurrentBalance';

export const ChainList = () => {
  const { data, visible } = useCommonPopupView();
  const chainList = data.chainBalances as DisplayChainWithWhiteLogo[];
  const balance = data.balance as number;
  const [currentChainList, setCurrentChainList] = React.useState<
    ChainItemType[]
  >([]);
  const [moreChainList, setMoreChainList] = React.useState<ChainItemType[]>([]);
  const [showMore, setShowMore] = React.useState(false);

  React.useEffect(() => {
    const list = chainList.map((item) => {
      return {
        ...item,
        percent: (item.usd_value / balance) * 100,
      };
    });
    setCurrentChainList(list.filter((item) => item.percent >= 1));
    setMoreChainList(list.filter((item) => item.percent < 1));
  }, [chainList]);

  React.useEffect(() => {
    if (!visible) {
      setShowMore(false);
    }
  }, [visible]);

  return (
    <div
      className={clsx(
        'bg-gray-bg2 rounded-[6px] p-[12px]',
        'flex gap-12 flex-wrap'
      )}
    >
      {currentChainList.map((item) => (
        <ChainItem key={item.id} item={item} />
      ))}
      {showMore ? (
        moreChainList.map((item) => <ChainItem key={item.id} item={item} />)
      ) : (
        <div
          className="cursor-pointer text-12 underline text-black leading-[20px]"
          onClick={() => {
            setShowMore(true);
          }}
        >
          Unfold {moreChainList.length} chains
        </div>
      )}
    </div>
  );
};
