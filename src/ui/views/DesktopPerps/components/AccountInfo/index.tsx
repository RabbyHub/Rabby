import { useRabbySelector } from '@/ui/store';
import { formatUsdValue } from '@/ui/utils';
import { formatPerpsPct } from '@/ui/views/Perps/utils';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DashedUnderlineText } from '../DashedUnderlineText';
import { isNaN } from 'lodash';
import { usePerpsAccount } from '@/ui/views/Perps/hooks/usePerpsAccount';
import { usePerpsPopupNav } from '@/ui/views/DesktopPerps/hooks/usePerpsPopupNav';
import { computeCrossMarginRatio, computeUnifiedAccountRatio } from './utils';

// Color thresholds for the unified-account ratio. Three equal zones —
// ≥66.7% danger, ≥33.3% warning, else healthy.
const RATIO_DANGER = 2 / 3;
const RATIO_WARNING = 1 / 3;

// Exact hex from the design spec (iOS-style system colors).
const GAUGE_GREEN = '#58C669';
const GAUGE_ORANGE = '#FF9F0A';
const GAUGE_RED = '#FF453A';

const ratioColor = (ratio: number) => {
  if (ratio >= RATIO_DANGER) return GAUGE_RED;
  if (ratio >= RATIO_WARNING) return GAUGE_ORANGE;
  return GAUGE_GREEN;
};

/**
 * 270° gauge (C-shape, 90° gap at bottom) per design spec. Three filled-arc
 * segments (green / orange / red) traced as the original 14×14 vector. The
 * needle rotates proportional to `ratio` ∈ [0,1]:
 *   ratio = 0   → points to the green-zone start (lower-left, ~225° math)
 *   ratio = 0.5 → points straight up
 *   ratio = 1   → mirrors to the red-zone end (lower-right)
 * Needle + pivot use `currentColor` so callers can theme via wrapper.
 */
const RatioGaugeIcon: React.FC<{ ratio: number }> = ({ ratio }) => {
  const clamped = Math.max(0, Math.min(1, isFinite(ratio) ? ratio : 0));
  // The static needle path already sits at the ratio=0 position. Rotate
  // CW around the pivot (7,7) by `clamped * 270°` to sweep across the
  // 270° arc.
  const needleAngle = clamped * 270;

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12.0239 3.31396C13.0137 4.46988 13.612 5.97091 13.612 7.612C13.612 9.07327 13.1374 10.4234 12.3347 11.5179L11.3859 10.569C11.9562 9.72484 12.2895 8.70743 12.2895 7.612C12.2895 6.33618 11.8376 5.16611 11.0854 4.25244L12.0239 3.31396Z"
        fill={GAUGE_RED}
      />
      <path
        d="M7.00052 1C8.53497 1 9.94713 1.52295 11.0691 2.39996L10.1246 3.34446C9.24907 2.70249 8.1694 2.32247 7.00052 2.32247C5.90505 2.32247 4.88727 2.65536 4.04304 3.22564L3.09424 2.27684C4.18874 1.47417 5.53922 1 7.00052 1Z"
        fill={GAUGE_ORANGE}
      />
      <path
        d="M3.04647 4.0988C2.21572 5.03312 1.71066 6.26346 1.71066 7.61205C1.71066 8.78093 2.09067 9.8606 2.73264 10.7361L1.78814 11.6806C0.911132 10.5587 0.388184 9.1465 0.388184 7.61205C0.388184 5.89823 1.03981 4.33636 2.10929 3.16162L3.04647 4.0988Z"
        fill={GAUGE_GREEN}
      />
      <g transform={`rotate(${needleAngle} 7 7)`}>
        <line
          x1="6.66168"
          y1="7.48562"
          x2="2.09979"
          y2="11.9736"
          stroke="currentColor"
          strokeWidth="0.881621"
        />
      </g>
      <circle cx="7" cy="7" r="1.54307" fill="currentColor" />
    </svg>
  );
};

export const AccountInfo: React.FC = () => {
  const { t } = useTranslation();
  const { openPerpsPopup } = usePerpsPopupNav();
  const clearinghouseState = useRabbySelector(
    (store) => store.perps.clearinghouseState
  );
  const rawSpotBalancesMap = useRabbySelector(
    (s) => s.perps.spotState.balancesMap
  );
  const marketDataMap = useRabbySelector((s) => s.perps.marketDataMap);

  const { accountValue, isUnifiedAccount } = usePerpsAccount();

  const positionAllPnl = useMemo(() => {
    const sum = clearinghouseState?.assetPositions?.reduce((acc, asset) => {
      return acc.plus(new BigNumber(asset.position.unrealizedPnl || 0));
    }, new BigNumber(0));
    return sum ? sum.toNumber() : 0;
  }, [clearinghouseState]);

  // Unified mode: official Hyperliquid Unified Account Ratio (per-collateral
  // -token bucketing). Non-unified: perp-only `crossMargin / cross equity`.
  const marginRatioNum = useMemo(() => {
    return isUnifiedAccount
      ? computeUnifiedAccountRatio({
          clearinghouseState,
          marketDataMap,
          spotBalancesMap: rawSpotBalancesMap,
        })
      : computeCrossMarginRatio(clearinghouseState);
  }, [isUnifiedAccount, clearinghouseState, marketDataMap, rawSpotBalancesMap]);

  const marginRatioText = useMemo(() => {
    return isNaN(marginRatioNum) ? '0%' : formatPerpsPct(marginRatioNum);
  }, [marginRatioNum]);

  // Cross account leverage = sum(|cross position notional|) / collateral.
  // Excludes isolated positions (their margin is independent of cross collateral).
  const accountLeverage = useMemo(() => {
    const denom = isUnifiedAccount
      ? Number(accountValue || 0)
      : Number(clearinghouseState?.marginSummary?.accountValue || 0);
    if (denom <= 0) return 0;

    const totalCrossNtl = (clearinghouseState?.assetPositions || [])
      .filter((p) => p.position.leverage?.type !== 'isolated')
      .reduce(
        (sum, p) => sum.plus(new BigNumber(p.position.positionValue || 0)),
        new BigNumber(0)
      );

    return totalCrossNtl.dividedBy(denom).toNumber();
  }, [
    isUnifiedAccount,
    accountValue,
    clearinghouseState?.assetPositions,
    clearinghouseState?.marginSummary?.accountValue,
  ]);

  // Perp-only equity (distinct from unified accountValue which adds spot).
  const perpsPortfolioValue = useMemo(() => {
    return Number(accountValue || 0);
  }, [accountValue]);

  const customBalance = useMemo(() => {
    return accountValue - Number(positionAllPnl || 0);
  }, [accountValue, positionAllPnl]);

  const handleDepositClick = () => openPerpsPopup('deposit');
  const handleWithdrawClick = () => openPerpsPopup('withdraw');

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

        {isUnifiedAccount ? (
          <div className="space-y-[8px] text-[12px] leading-[14px]">
            <div className="text-r-neutral-title-1 font-medium mb-[4px]">
              {t('page.perpsPro.accountInfo.unifiedAccountSummary')}
            </div>

            <div className="flex items-center justify-between">
              <DashedUnderlineText
                needCursor={false}
                tooltipText={t(
                  'page.perpsPro.accountInfo.unifiedAccountRatioTips'
                )}
                className="text-rb-neutral-foot"
              >
                {t('page.perpsPro.accountInfo.unifiedAccountRatio')}
              </DashedUnderlineText>
              <div className="font-medium flex items-center gap-[4px]">
                <span className="text-r-neutral-title-1 flex items-center">
                  <RatioGaugeIcon ratio={marginRatioNum} />
                </span>
                <span style={{ color: ratioColor(marginRatioNum) }}>
                  {marginRatioText}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <DashedUnderlineText
                needCursor={false}
                tooltipText={t(
                  'page.perpsPro.accountInfo.maintenanceMarginTips'
                )}
                className="text-rb-neutral-foot"
              >
                {t('page.perpsPro.accountInfo.perpsMaintenanceMargin')}
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
                  'page.perpsPro.accountInfo.unifiedAccountLeverageTips'
                )}
                className="text-rb-neutral-foot"
              >
                {t('page.perpsPro.accountInfo.unifiedAccountLeverage')}
              </DashedUnderlineText>
              <div className="text-r-neutral-title-1 font-medium">
                {isNaN(accountLeverage) ? '0' : accountLeverage.toFixed(2)}x
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-rb-neutral-foot">
                {t('page.perpsPro.accountInfo.perpsPortfolioValue')}
              </div>
              <div className="text-r-neutral-title-1 font-medium">
                {formatUsdValue(perpsPortfolioValue, BigNumber.ROUND_DOWN)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-rb-neutral-foot">
                {t('page.perpsPro.accountInfo.perpsUnrealizedPnl')}
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
          </div>
        ) : (
          <div className="space-y-[8px] text-[12px] leading-[14px]">
            <div className="text-r-neutral-title-1 font-medium mb-[4px]">
              {t('page.perpsPro.accountInfo.accountSummary')}
            </div>
            <div className="flex items-center justify-between">
              <DashedUnderlineText
                tooltipText={t('page.perpsPro.accountInfo.balanceTip')}
                needCursor={false}
                className="text-rb-neutral-foot"
              >
                {t('page.perpsPro.accountInfo.availableBalance')}
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
                tooltipText={t(
                  'page.perpsPro.accountInfo.crossMarginRatioTips'
                )}
                className="text-rb-neutral-foot"
              >
                {t('page.perpsPro.accountInfo.crossMarginRatio')}
              </DashedUnderlineText>
              <div className="text-r-neutral-title-1 font-medium">
                {marginRatioText}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <DashedUnderlineText
                needCursor={false}
                tooltipText={t(
                  'page.perpsPro.accountInfo.maintenanceMarginTips'
                )}
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
                {isNaN(accountLeverage) ? '0' : accountLeverage.toFixed(2)}x
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
