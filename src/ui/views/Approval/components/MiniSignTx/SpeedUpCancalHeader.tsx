import { calcPercent } from '@/ui/utils';
import { Skeleton } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconSpeedUp } from 'ui/assets/sign/tx/speedup.svg';

export const SpeedUpCancelHeader = ({
  isSpeedUp,
  isCancel,
  originGasPrice,
  currentGasPrice,
}: {
  isSpeedUp: boolean;
  isCancel: boolean;
  originGasPrice: string;
  currentGasPrice: string;
}) => {
  const { t } = useTranslation();
  //   const percent = calcPercent();
  console.log('originGasPrice', {
    originGasPrice,
    currentGasPrice,
    isSpeedUp,
    isCancel,
  });

  const percent = useMemo(() => {
    const originBn = new BigNumber(originGasPrice || '0');
    return (
      new BigNumber(currentGasPrice || '0')
        .minus(originBn)
        .div(originBn)
        .times(100)
        .toFixed(0) + '%'
    );
  }, [originGasPrice, currentGasPrice]);
  if (!isSpeedUp && !isCancel) {
    return null;
  }
  return (
    <div className="-mx-20 px-20 mb-16 border-b-[0.5px] border-solid border-rabby-neutral-line">
      <div className="text-center text-20 font-medium text-r-neutral-title1">
        {isSpeedUp ? t('page.miniSignFooterBar.speedUpTitle') : ''}
        {isCancel ? t('page.miniSignFooterBar.cancelTitle') : ''}
      </div>

      {!currentGasPrice ? (
        <Skeleton.Input
          active
          style={{
            height: 52,
            marginTop: 16,
            marginBottom: 28,
            padding: '18px 12px',
          }}
          className="w-full"
        />
      ) : (
        <div
          className={clsx(
            'mt-16 mb-28',
            'flex items-center justify-center text-13 font-medium text-r-green-default gap-2',
            'min-h-[52px] px-[12px] py-[18px] rounded-[8px] bg-r-green-light'
          )}
        >
          <RcIconSpeedUp viewBox="0 0 10 16" className="w-16 h-16" />
          <div>
            {isSpeedUp
              ? t('page.miniSignFooterBar.speedUpDesc', { percent })
              : t('page.miniSignFooterBar.cancleDesc', { percent })}
          </div>
        </div>
      )}
    </div>
  );
};
