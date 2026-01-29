import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import {
  CustomMarket,
  getMarketLogo,
  MarketDataType,
  marketsData,
} from '../../config/market';
import { findChain } from '@/utils/chain';
import { ReactComponent as RcIconChecked } from '@/ui/assets/check-3.svg';

const marketList: MarketDataType[] = Object.values(marketsData);

export const MarketSelector: React.FC<{
  value?: CustomMarket;
  onChange?: (value: CustomMarket) => void;
  className?: string;
}> = ({ value = 'core', onChange, className }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const options: {
    value: CustomMarket;
    label: string;
    uri: string;
  }[] = useMemo(() => {
    return marketList.map((item) => {
      const chain = findChain({ id: item.chainId });
      return {
        value: item.market,
        label: item.marketTitle,
        uri: getMarketLogo(item?.market)?.uri || chain?.logo || '',
      };
    });
  }, [marketList]);

  const currentOption =
    options.find((opt) => opt.value === value) || options[0];

  const handleSelect = (newValue: CustomMarket) => {
    onChange?.(newValue);
    setIsOpen(false);
  };

  return (
    <div className={clsx('relative', className)}>
      <div
        className={clsx(
          'flex items-center gap-[8px] px-[12px] h-[32px] rounded-[8px]',
          'border border-solid border-rb-neutral-line bg-rb-neutral-bg-1',
          'cursor-pointer hover:border-rb-brand-default',
          'text-[14px] leading-[17px] font-medium text-r-neutral-title-1'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <img
          src={currentOption.uri}
          alt={currentOption.label}
          width={20}
          height={20}
          className="rounded-full mr-[8px]"
        />
        <span>{currentOption.label}</span>
        <RcIconArrowDownCC
          className={clsx(
            'w-[16px] h-[16px] transition-transform',
            isOpen && 'transform rotate-180'
          )}
        />
      </div>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-[36px] left-0 z-20 w-[360px] bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line rounded-[12px] shadow-lg">
            <div className="grid grid-cols-2">
              {options.map((option) => {
                const isSelected = value === option.value;
                return (
                  <div
                    key={option.value}
                    className={clsx(
                      'h-[44px] flex items-center justify-between cursor-pointer',
                      'px-[16px] pr-[20px]',
                      'hover:bg-rb-neutral-bg-3',
                      isSelected && 'bg-rb-neutral-bg-3',
                      'text-[14px] leading-[17px] font-medium text-r-neutral-title-1'
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <div className="flex items-center gap-[8px]">
                      <img
                        src={option.uri}
                        alt={option.label}
                        width={20}
                        height={20}
                        className="rounded-full mr-[8px]"
                      />
                      <span>{option.label}</span>
                    </div>
                    {isSelected && <RcIconChecked />}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
