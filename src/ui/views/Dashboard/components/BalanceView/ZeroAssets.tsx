import React from 'react';
import IconBg from '@/ui/assets/dashboard/zero-bg.svg';
import clsx from 'clsx';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/ui/hooks/useCurrency';
import { formatCurrencyParts } from '@/ui/utils';

export const ZeroAssets = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const { currency } = useCurrency();
  // const formattedBalance = formatCurrencyParts(0, { currency });

  return (
    <div
      style={{
        backgroundImage: `url(${IconBg})`,
      }}
      className="h-[132px] flex flex-col items-center p-[16px]"
    >
      <h1 className="text-[24px] leading-[29px] font-bold text-r-neutral-title-2 mb-[2px]">
        {/* {formattedBalance?.isPrefix
          ? `${formattedBalance?.symbol}${formattedBalance.amount}`
          : `${formattedBalance?.amount} ${formattedBalance.symbol}`} */}
        $0.00
      </h1>
      <p className="text-[12px] leading-[14px] font-normal text-r-neutral-title-2 mb-[12px]">
        {t('page.dashboard.ZeroAssets.desc')}
      </p>
      <button
        type="button"
        className={clsx(
          'rounded-[8px] bg-rb-neutral-bg-2 py-[9px] px-[16px] min-w-[170px]',
          'text-[15px] leading-[18px] font-medium text-rb-brand-default',
          'hover:bg-r-blue-light-2 active:bg-r-blue-disable active:text-rb-brand-default-icon'
        )}
        onClick={() => {
          history.push('/receive?isZero=1');
        }}
      >
        {t('page.dashboard.ZeroAssets.addAssets')}
      </button>
    </div>
  );
};
