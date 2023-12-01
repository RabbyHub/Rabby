import React, { useMemo } from 'react';

import IconDot from '@/ui/assets/pending/icon-dot.svg';
import { findChainByServerID } from '@/utils/chain';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { useCountDown } from 'ahooks';
import { useTranslation } from 'react-i18next';
import IconWarning from '@/ui/assets/pending/icon-warning-1.svg';

export const usePredictTime = (targetDate?: number) => {
  const max = Date.now() + 100 * 60 * 60 * 1000;

  const [countDown, { days, hours: _hours, minutes, seconds }] = useCountDown({
    targetDate: (targetDate || 0) >= max ? max : targetDate,

    interval: 1000,
  });

  return useMemo(() => {
    if (!targetDate) {
      return {
        hours: '--',
        minutes: '--',
        seconds: '--',
      };
    }

    return {
      hours: (days * 24 + _hours).toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
    };
  }, [minutes, seconds, days, _hours, targetDate]);
};

export const Predict = ({
  data,
  isPending,
  loading,
}: {
  data?: TxRequest;
  isPending?: boolean;
  loading?: boolean;
}) => {
  const predict = usePredictTime((data?.predict_packed_at || 0) * 1000);

  const { t } = useTranslation();

  const chain = data?.chain_id ? findChainByServerID(data?.chain_id) : null;

  const isCompleted = !isPending;
  const jumpNonce = data?.predict_err_code === 1;

  if (isCompleted) {
    return (
      <div className="min-h-[253px] pt-[93px]">
        <div className="text-[48px] text-medium leading-[57px] text-[#fff] text-center ">
          {t('page.pendingDetail.Predict.completed')}
        </div>
      </div>
    );
  }

  if (jumpNonce) {
    return (
      <div className="min-h-[253px] text-center pt-[63px]">
        <div className="text-r-orange-default text-[28px] leading-[33px] font-medium mb-[25px] flex items-center gap-[8px] justify-center">
          <img src={IconWarning} alt="" />
          {t('page.pendingDetail.Predict.predictFailed')}
        </div>
        <div className="text-r-orange-default text-[24px] leading-[29px]">
          {t('page.pendingDetail.Predict.skipNonce', {
            chain: chain?.name || 'Unknown',
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[253px] pt-[40px]">
      <div className="text-r-neutral-title-2 text-center text-[24px] leading-[29px] mb-[24px]">
        {t('page.pendingDetail.Header.predictTime')}
      </div>

      <div className="flex items-center justify-center gap-[24px]">
        <div className="flex items-center justify-center gap-[16px]">
          <div className="bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[120px] h-[120px] flex items-center justify-center text-[72px] text-white font-bold leading-[95px]">
            {predict?.hours[0] ?? '-'}
          </div>
          <div className="bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[120px] h-[120px] flex items-center justify-center text-[72px] text-white font-bold leading-[95px]">
            {predict?.hours[1] ?? '-'}
          </div>
        </div>
        <img src={IconDot} alt="" />
        <div className="flex items-center justify-center gap-[16px]">
          <div className="bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[120px] h-[120px] flex items-center justify-center text-[72px] text-white font-bold leading-[95px]">
            {predict?.minutes[0] ?? '-'}
          </div>

          <div className="bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[120px] h-[120px] flex items-center justify-center text-[72px] text-white font-bold leading-[95px]">
            {predict?.minutes[1] ?? '-'}
          </div>
        </div>
        <img src={IconDot} alt="" />
        <div className="flex items-center justify-center gap-[16px]">
          <div className="bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[120px] h-[120px] flex items-center justify-center text-[72px] text-white font-bold leading-[95px]">
            {predict?.seconds[0] ?? '-'}
          </div>
          <div className="bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[120px] h-[120px] flex items-center justify-center text-[72px] text-white font-bold leading-[95px]">
            {predict?.seconds[1] ?? '-'}
          </div>
        </div>
      </div>
    </div>
  );
};
