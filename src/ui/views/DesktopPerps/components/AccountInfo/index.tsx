import { useRabbySelector } from '@/ui/store';
import { formatUsdValue, splitNumberByStep } from '@/ui/utils';
import { formatPerpsPct } from '@/ui/views/Perps/utils';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { DashedUnderlineText } from '../DashedUnderlineText';
import { Tooltip } from 'antd';

export const AccountInfo: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const clearinghouseState = useRabbySelector(
    (store) => store.perps.clearinghouseState
  );

  const positionAllPnl = useMemo(() => {
    return (
      clearinghouseState?.assetPositions.reduce((acc, asset) => {
        return acc + Number(asset.position.unrealizedPnl || 0);
      }, 0) || 0
    );
  }, [clearinghouseState]);

  const crossMarginRatio = useMemo(() => {
    const num = new BigNumber(
      clearinghouseState?.crossMarginSummary.totalMarginUsed || 0
    ).div(new BigNumber(clearinghouseState?.marginSummary?.accountValue || 1));
    return formatPerpsPct(num.toNumber());
  }, [clearinghouseState]);

  const handleDepositClick = () => {
    const currentPathname = history.location.pathname;

    history.replace(`${currentPathname}?action=deposit`);
  };
  const handleWithdrawClick = () => {
    const currentPathname = history.location.pathname;

    history.replace(`${currentPathname}?action=withdraw`);
  };

  const customBalance = useMemo(() => {
    const allFundingPayments = clearinghouseState?.assetPositions.reduce(
      (acc, asset) => {
        return acc + Number(asset.position.cumFunding.sinceOpen || 0);
      },
      0
    );
    return (
      Number(clearinghouseState?.marginSummary?.accountValue || 0) -
      Number(positionAllPnl || 0)
    );
  }, [clearinghouseState, positionAllPnl]);

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
            <Tooltip
              title={t('page.perpsPro.accountInfo.accountEquityTip')}
              overlayClassName="rectangle"
              placement="top"
              trigger="hover"
            >
              <DashedUnderlineText
                needCursor={false}
                className="text-r-neutral-title-1"
              >
                {t('page.perpsPro.accountInfo.accountEquity')}
              </DashedUnderlineText>
            </Tooltip>
            <div className="text-r-neutral-title-1 font-medium">
              {formatUsdValue(
                Number(clearinghouseState?.marginSummary?.accountValue || 0),
                BigNumber.ROUND_DOWN
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Tooltip
              title={t('page.perpsPro.accountInfo.balanceTip')}
              overlayClassName="rectangle"
              placement="top"
              trigger="hover"
            >
              <DashedUnderlineText
                needCursor={false}
                className="text-r-neutral-title-1"
              >
                {t('page.perpsPro.accountInfo.balance')}
              </DashedUnderlineText>
            </Tooltip>
            <div className="text-r-neutral-title-1">
              {formatUsdValue(customBalance)}
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
              {formatUsdValue(Math.abs(positionAllPnl))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Tooltip
              title={t('page.perpsPro.accountInfo.crossMarginRatioTips')}
              overlayClassName="rectangle"
              placement="top"
              trigger="hover"
            >
              <DashedUnderlineText
                needCursor={false}
                className="text-rb-neutral-foot"
              >
                {t('page.perpsPro.accountInfo.crossMarginRatio')}
              </DashedUnderlineText>
            </Tooltip>
            <div className="text-r-neutral-title-1 font-medium">
              {crossMarginRatio}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Tooltip
              title={t('page.perpsPro.accountInfo.maintenanceMarginTips')}
              overlayClassName="rectangle"
              placement="top"
              trigger="hover"
            >
              <DashedUnderlineText
                needCursor={false}
                className="text-rb-neutral-foot"
              >
                {t('page.perpsPro.accountInfo.maintenanceMargin')}
              </DashedUnderlineText>
            </Tooltip>
            <div className="text-r-neutral-title-1 font-medium">
              {formatUsdValue(
                Number(
                  clearinghouseState?.crossMarginSummary.totalMarginUsed || 0
                )
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Tooltip
              title={t('page.perpsPro.accountInfo.crossAccountLeverageTips')}
              overlayClassName="rectangle"
              placement="top"
              trigger="hover"
            >
              <DashedUnderlineText
                needCursor={false}
                className="text-rb-neutral-foot"
              >
                {t('page.perpsPro.accountInfo.crossAccountLeverage')}
              </DashedUnderlineText>
            </Tooltip>
            <div className="text-r-neutral-title-1 font-medium">
              {(
                Number(clearinghouseState?.marginSummary?.totalNtlPos || 0) /
                Number(clearinghouseState?.marginSummary?.accountValue || 1)
              ).toFixed(2)}
              x
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
