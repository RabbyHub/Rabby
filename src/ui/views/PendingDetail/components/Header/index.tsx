import React, { ReactNode, useMemo } from 'react';
import styled from 'styled-components';

import { TransactionGroup } from '@/background/service/transactionHistory';
import IconBg from '@/ui/assets/pending/header-bg.png';
import IconDot from '@/ui/assets/pending/icon-dot.svg';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { useCountDown } from 'ahooks';
import { TxHash } from './TxHash';
import { TxStatus } from './TxStatus';
import { useTranslation } from 'react-i18next';

const Wrapper = styled.div`
  position: relative;
  min-height: 420px;
  &:after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 420px;
    background: url(${IconBg}) no-repeat center / cover;
  }
`;

const usePredict = (leftTime?: number) => {
  const [countDown, { minutes, seconds }] = useCountDown({
    leftTime: leftTime || 0,
    interval: 1000,
  });

  return useMemo(() => {
    if (leftTime == null) {
      return ['-', '-', '-', '-'];
    }

    return minutes
      .toString()
      .padStart(2, '0')
      .split('')
      .concat(seconds.toString().padStart(2, '0').split(''));
  }, [minutes, seconds, leftTime]);
};

export const Header = ({
  data,
  children,
  tx,
  onReBroadcast,
}: {
  data?: TxRequest;
  tx?: TransactionGroup | null;
  children?: ReactNode;
  onReBroadcast?(): void;
}) => {
  const leftTime = useMemo(() => {
    const leftTime = data?.predict_packed_at
      ? Date.now() - data?.predict_packed_at * 1000
      : 0;
    return leftTime > 0 ? leftTime : undefined;
  }, [data?.predict_packed_at]);

  const predict = usePredict(leftTime);

  const { t } = useTranslation();

  return (
    <Wrapper>
      <div className="layout-container relative z-10">
        <div className="flex leading-[24px] py-[19px] min-h-[74px] items-center">
          <div className="mr-auto">
            {tx && (
              <TxStatus
                txRequest={data}
                tx={tx}
                onReBroadcast={onReBroadcast}
              />
            )}
          </div>
          <div>{tx ? <TxHash tx={tx} /> : null}</div>
        </div>
        <div className="mb-[34px]">
          <div className="text-r-neutral-title-2 text-center text-[24px] leading-[29px] mt-[40px] mb-[24px]">
            {t('page.pendingDetail.Header.predictTime')}
          </div>
          <div className="flex items-center justify-center gap-[16px]">
            <div className="bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[120px] h-[120px] flex items-center justify-center text-[80px] text-white font-bold leading-[95px]">
              {predict[0]}
            </div>
            <div className="flex items-center gap-[24px]">
              <div className="bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[120px] h-[120px] flex items-center justify-center text-[80px] text-white font-bold leading-[95px]">
                {predict[1]}
              </div>
              <img src={IconDot} alt="" />
              <div className="bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[120px] h-[120px] flex items-center justify-center text-[80px] text-white font-bold leading-[95px]">
                {predict[2]}
              </div>
            </div>
            <div className="bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[120px] h-[120px] flex items-center justify-center text-[80px] text-white font-bold leading-[95px]">
              {predict[3]}
            </div>
          </div>
        </div>
        {children}
      </div>
    </Wrapper>
  );
};
