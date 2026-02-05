import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { formatPerpsPct } from '@/ui/views/Perps/utils';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { DashedUnderlineText } from '../DashedUnderlineText';
import { isNaN } from 'lodash';

export const AccountInfo: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const clearinghouseState = useRabbySelector(
    (store) => store.perps.clearinghouseState
  );
  const allDexsPositions = useRabbySelector(
    (store) => store.perps.allDexsPositions
  );
  const allDexsClearinghouseState = useRabbySelector(
    (store) => store.perps.allDexsClearinghouseState
  );

  const positionAllPnl = useMemo(() => {
    return (
      allDexsPositions?.reduce((acc, asset) => {
        return acc + Number(asset.position.unrealizedPnl || 0);
      }, 0) || 0
    );
  }, [allDexsPositions]);

  const crossMarginRatio = useMemo(() => {
    const num = new BigNumber(
      clearinghouseState?.crossMaintenanceMarginUsed || 0
    ).div(new BigNumber(clearinghouseState?.marginSummary?.accountValue || 1));
    return isNaN(num.toNumber()) ? '0%' : formatPerpsPct(num.toNumber());
  }, [clearinghouseState]);

  const handleDepositClick = () => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('action', 'deposit');
    history.push({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
  };
  const handleWithdrawClick = () => {
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('action', 'withdraw');
    history.push({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
  };

  const accountValue = useMemo(() => {
    return (
      allDexsClearinghouseState?.reduce((acc, item) => {
        return acc + Number(item[1].marginSummary.accountValue || 0);
      }, 0) || 0
    );
  }, [allDexsClearinghouseState]);

  const customBalance = useMemo(() => {
    return Number(accountValue) - Number(positionAllPnl || 0);
  }, [accountValue, positionAllPnl]);

  const crossAccountLeverage = useMemo(() => {
    return (
      Number(clearinghouseState?.marginSummary?.totalNtlPos || 0) /
      Number(clearinghouseState?.marginSummary?.accountValue || 1)
    );
  }, [clearinghouseState]);

  return (
    <div className="w-full h-full flex flex-col flex-shrink-0 overflow-hidden">
      <div className="flex-1 overflow-auto p-[16px] min-h-0">
        <div className="flex items-center gap-[8px] mb-[16px]">
          <button
            type="button"
            className={clsx(
              'w-full bg-rb-neutral-bg-4 rounded-[8px] h-[32px] flex items-center justify-center hover:border-rb-brand-default border border-solid border-transparent',
              'text-[12px] leading-[14px] font-medium text-r-neutral-title-1'
            )}
            onClick={handleDepositClick}
          >
            {t('page.perpsPro.accountInfo.deposit')}
          </button>
          <button
            type="button"
            className={clsx(
              'w-full bg-rb-neutral-bg-4 rounded-[8px] h-[32px] flex items-center justify-center hover:border-rb-brand-default border border-solid border-transparent',
              'text-[12px] leading-[14px] font-medium text-r-neutral-title-1'
            )}
            onClick={handleWithdrawClick}
          >
            {t('page.perpsPro.accountInfo.withdraw')}
          </button>
        </div>
        <div className="space-y-[8px] text-[12px] leading-[14px]">
          <div className="flex items-center justify-between">
            <DashedUnderlineText
              needCursor={false}
              tooltipText={t('page.perpsPro.accountInfo.accountEquityTip')}
              className="text-r-neutral-title-1"
            >
              {t('page.perpsPro.accountInfo.accountEquity')}
            </DashedUnderlineText>
            <div className="text-r-neutral-title-1 font-medium">
              {formatUsdValue(Number(accountValue), BigNumber.ROUND_DOWN)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DashedUnderlineText
              tooltipText={t('page.perpsPro.accountInfo.balanceTip')}
              needCursor={false}
              className="text-r-neutral-title-1"
            >
              {t('page.perpsPro.accountInfo.balance')}
            </DashedUnderlineText>
            <div className="text-r-neutral-title-1 font-medium">
              {formatUsdValue(customBalance, BigNumber.ROUND_DOWN)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-rb-neutral-foot">
              {t('page.perpsPro.accountInfo.unrealizedPnl')}
            </div>
            <div
              className={clsx(
                'font-medium',
                positionAllPnl >= 0
                  ? 'text-rb-green-default'
                  : 'text-rb-red-default'
              )}
            >
              {positionAllPnl >= 0 ? '+' : '-'}
              {formatUsdValue(Math.abs(positionAllPnl), BigNumber.ROUND_DOWN)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DashedUnderlineText
              needCursor={false}
              tooltipText={t('page.perpsPro.accountInfo.crossMarginRatioTips')}
              className="text-rb-neutral-foot"
            >
              {t('page.perpsPro.accountInfo.crossMarginRatio')}
            </DashedUnderlineText>
            <div className="text-r-neutral-title-1 font-medium">
              {crossMarginRatio}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DashedUnderlineText
              needCursor={false}
              tooltipText={t('page.perpsPro.accountInfo.maintenanceMarginTips')}
              className="text-rb-neutral-foot"
            >
              {t('page.perpsPro.accountInfo.maintenanceMargin')}
            </DashedUnderlineText>
            <div className="text-r-neutral-title-1 font-medium">
              {formatUsdValue(
                Number(clearinghouseState?.crossMaintenanceMarginUsed || 0),
                BigNumber.ROUND_DOWN
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <DashedUnderlineText
              needCursor={false}
              tooltipText={t(
                'page.perpsPro.accountInfo.crossAccountLeverageTips'
              )}
              className="text-rb-neutral-foot"
            >
              {t('page.perpsPro.accountInfo.crossAccountLeverage')}
            </DashedUnderlineText>
            <div className="text-r-neutral-title-1 font-medium">
              {isNaN(crossAccountLeverage)
                ? '0'
                : crossAccountLeverage.toFixed(2)}
              x
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
