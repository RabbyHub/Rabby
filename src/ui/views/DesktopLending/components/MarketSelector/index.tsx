import React, { useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';

export const MarketSelector: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}> = ({ value = 'core', onChange, className }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const options: { value: string; label: string }[] = [
    { value: 'core', label: t('page.lending.market.core') },
    { value: 'isolated', label: t('page.lending.market.isolated') },
  ];

  const currentOption =
    options.find((opt) => opt.value === value) || options[0];

  const handleSelect = (newValue: string) => {
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
        <div className="w-[16px] h-[16px] rounded-full bg-rb-brand-default flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-white">M</span>
        </div>
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
          <div className="absolute top-[36px] left-0 z-20 bg-rb-neutral-bg-1 border border-solid border-rb-neutral-line rounded-[8px] shadow-lg min-w-[140px]">
            {options.map((option) => (
              <div
                key={option.value}
                className={clsx(
                  'px-[12px] h-[36px] flex items-center cursor-pointer',
                  'hover:bg-rb-neutral-bg-3',
                  value === option.value && 'bg-rb-neutral-bg-3',
                  'text-[14px] leading-[17px] font-medium text-r-neutral-title-1'
                )}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
