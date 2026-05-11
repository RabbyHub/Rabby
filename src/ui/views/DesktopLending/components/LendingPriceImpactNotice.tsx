import { Tooltip } from 'antd';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ReactComponent as RcIconInfo } from '@/ui/assets/info-cc.svg';

import { SwappableToken } from '../types/swap';
import { formatAmount, formatUsdValue } from '../utils/format';

type LendingPriceImpactNoticeProps = {
  payToken?: SwappableToken;
  receiveToken?: SwappableToken;
  payAmount?: string | number;
  receiveAmount?: string | number;
  loading?: boolean;
};

const LendingPriceImpactNotice = ({
  payToken,
  receiveToken,
  payAmount,
  receiveAmount,
  loading,
}: LendingPriceImpactNoticeProps) => {
  const { t } = useTranslation();

  const data = useMemo(() => {
    if (
      loading ||
      !payToken ||
      !receiveToken ||
      !Number(payAmount || 0) ||
      !Number(receiveAmount || 0)
    ) {
      return null;
    }

    const payUsdBn = new BigNumber(payAmount || 0).multipliedBy(
      payToken.usdPrice || '0'
    );
    const receiveUsdBn = new BigNumber(receiveAmount || 0).multipliedBy(
      receiveToken.usdPrice || '0'
    );

    if (payUsdBn.lte(0) || receiveUsdBn.lte(0) || receiveUsdBn.gte(payUsdBn)) {
      return null;
    }

    const diff = payUsdBn.minus(receiveUsdBn).div(payUsdBn).multipliedBy(100);
    const lossUsd = payUsdBn.minus(receiveUsdBn);

    return {
      diff: diff.toFixed(1),
      payUsd: formatUsdValue(payUsdBn.toString(10)),
      receiveUsd: formatUsdValue(receiveUsdBn.toString(10)),
      lossUsd: formatUsdValue(lossUsd.toString(10)),
    };
  }, [loading, payAmount, payToken, receiveAmount, receiveToken]);

  if (!data) {
    return null;
  }

  return (
    <div className="mt-12 px-16 leading-4 text-12 text-r-neutral-foot">
      <div className="flex justify-between">
        <span>{t('page.bridge.price-impact')}</span>
        <span
          className={clsx(
            'font-medium inline-flex items-center',
            'text-r-red-default'
          )}
        >
          -{data.diff}%
          <Tooltip
            align={{
              offset: [10, 0],
            }}
            placement="topRight"
            overlayClassName="rectangle max-w-[360px]"
            title={
              <div className="flex flex-col gap-4 py-[5px] text-13">
                <div>
                  {t('page.bridge.est-payment')} {formatAmount(payAmount || 0)}
                  {payToken?.symbol} ≈ {data.payUsd}
                </div>
                <div>
                  {t('page.bridge.est-receiving')}{' '}
                  {formatAmount(receiveAmount || 0)}
                  {receiveToken?.symbol} ≈ {data.receiveUsd}
                </div>
                <div>
                  {t('page.bridge.est-difference')} {data.lossUsd}
                </div>
              </div>
            }
          >
            <RcIconInfo className="ml-4 h-14 w-14 text-rabby-neutral-foot" />
          </Tooltip>
        </span>
      </div>
      <div className="mt-[8px] rounded-[4px] border-[0.5px] border-rabby-red-default bg-r-red-light p-8 text-13 font-normal text-r-red-default">
        {t('page.bridge.loss-tips', {
          usd: data.lossUsd,
        })}
      </div>
    </div>
  );
};

export default LendingPriceImpactNotice;
