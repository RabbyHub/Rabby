import React from 'react';
import { useRabbySelector } from '@/ui/store';
import { TokenImg } from '@/ui/views/Perps/components/TokenImg';
import { PerpsDisplayCoinName } from '@/ui/views/Perps/components/PerpsDisplayCoinName';

export const About: React.FC = () => {
  const { selectedTokenDetail, selectedCoin, marketDataMap } = useRabbySelector(
    (store) => store.perps
  );
  const marketItem = marketDataMap[selectedCoin];

  if (!selectedTokenDetail?.description) {
    return null;
  }

  return (
    <div className="h-full overflow-auto px-[20px] py-[32px] flex flex-col items-center">
      <TokenImg
        logoUrl={marketItem?.logoUrl || ''}
        withDirection={false}
        size={24}
      />
      {marketItem ? (
        <PerpsDisplayCoinName
          item={marketItem}
          separator="-"
          className="mt-[6px] text-[20px] leading-[24px] font-bold"
          quoteClassName="text-r-neutral-title-1"
        />
      ) : null}
      <div className="mt-[12px] w-[460px] text-center text-[13px] leading-[18px] text-r-neutral-foot whitespace-normal break-words">
        {selectedTokenDetail.description}
      </div>
    </div>
  );
};
