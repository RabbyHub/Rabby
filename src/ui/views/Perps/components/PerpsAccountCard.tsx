import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { Skeleton } from 'antd';
import { Account } from '@/background/service/preference';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { usePerpsAccount } from '../hooks/usePerpsAccount';
import { usePerpsPortfolioLiveValue } from '../hooks/usePerpsPortfolioLiveValue';
import {
  getLatestPortfolioValue,
  compute24hChange,
  isPortfolioAllZero,
} from '../utils/perpsPortfolio';
import type { PortfolioPeriodKey } from '../utils/perpsPortfolio';
import type { PerpsBreakdownMode } from '../utils/accountPricing';
import { PerpsQuoteAsset } from '../constants';
import { PerpsPortfolioChart } from './PerpsPortfolioChart';
import { PerpsPortfolioBreakdownTips } from './PerpsPortfolioBreakdownTips';
import { RcIconInfoCC } from '@/ui/assets/desktop/common';
import { ReactComponent as RcIconBalanceAdd } from '@/ui/assets/perps/IconBalanceAdd.svg';
import { ReactComponent as RcIconBalanceMinus } from '@/ui/assets/perps/IconBalanceMinus.svg';
import { ReactComponent as RcIconAddFunds } from '@/ui/assets/perps/IconAddFunds.svg';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { ReactComponent as RcIconPerpsGuideLogo } from '@/ui/assets/perps/IconPerpsGuideLogo.svg';
import { ReactComponent as RcIconPerpsGuideLogoDark } from '@/ui/assets/perps/IconPerpsGuideLogoDark.svg';
import perpsGuideBg from '@/ui/assets/perps/IconPerpsGuideBg.svg';
import perpsGuideBgDark from '@/ui/assets/perps/IconPerpsGuideBgDark.svg';
import { useThemeMode } from '@/ui/hooks/usePreference';

interface PerpsAccountCardProps {
  currentPerpsAccount: Account | null;
  onDeposit: () => void;
  onWithdraw: () => void;
  onLearnMore: () => void;
  onSwap?: (source?: PerpsQuoteAsset) => void;
}

export const PerpsAccountCard: React.FC<PerpsAccountCardProps> = ({
  currentPerpsAccount,
  onDeposit,
  onWithdraw,
  onLearnMore,
  // The chips row (and its Swap entry) was removed from this card (Task 9).
  // Kept in the signature so home.tsx's existing call site doesn't need to
  // change.
  onSwap,
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();

  const [isHovered, setIsHovered] = useState(false);
  const [period, setPeriod] = useState<PortfolioPeriodKey>('day');

  const {
    accountValue,
    availableBalance,
    isAvailableBalanceReady,
    isUnifiedAccount,
    isPortfolioMargin,
  } = usePerpsAccount();
  const address = currentPerpsAccount?.address?.toLowerCase();
  const portfolioEntry = useRabbySelector((s) =>
    address ? s.perps.portfolioMap[address] : undefined
  );
  const portfolioData = portfolioEntry?.data ?? null;
  const liveValue = usePerpsPortfolioLiveValue();

  const portfolioValue = useMemo(
    () => (portfolioData ? getLatestPortfolioValue(portfolioData) : null),
    [portfolioData]
  );
  const displayValue = liveValue ?? portfolioValue;

  const change24h = useMemo(
    () => (portfolioData ? compute24hChange(portfolioData) : null),
    [portfolioData]
  );

  const isPortfolioEmpty = useMemo(
    () => !!portfolioData && isPortfolioAllZero(portfolioData),
    [portfolioData]
  );

  // 'zero': no account, or an account whose history is all zeros.
  // 'loading': logged in but no data yet — skeletons, never a fake $0.
  // 'error': the fetch (with its retries) exhausted and there is still no
  // cached data to fall back on — distinct from 'zero' so the headline
  // doesn't lie about the balance being $0.
  const portfolioFailed = portfolioEntry?.status === 'error';
  const viewState: 'zero' | 'loading' | 'error' | 'data' = !address
    ? 'zero'
    : portfolioData == null
    ? portfolioFailed
      ? 'error'
      : 'loading'
    : isPortfolioEmpty
    ? 'zero'
    : 'data';

  // Only a fully-loaded, non-empty portfolio can expand into the chart
  // (matches spec's canExpandChart = !!portfolioData && !isPortfolioEmpty).
  const expanded = isHovered && viewState === 'data';

  // No period memory: every expand starts back at 1D.
  useEffect(() => {
    if (expanded) setPeriod('day');
  }, [expanded]);

  useEffect(() => {
    if (!address) return;
    dispatch.perps.fetchPerpsPortfolio({ address });
    dispatch.perps.fetchStakingSummary(address);
    const timer = setInterval(() => {
      // popup unmounts when closed; this mainly guards a backgrounded tab.
      if (document.visibilityState !== 'visible') return;
      dispatch.perps.fetchPerpsPortfolio({ address, force: true });
      dispatch.perps.fetchStakingSummary(address);
    }, 60_000);
    return () => clearInterval(timer);
  }, [address, dispatch]);

  // Gated on isAvailableBalanceReady so the deposit CTA doesn't flash before
  // the slices Available depends on land, then flip back to the two-button
  // state once a real (non-zero) balance arrives.
  const hasNoBalance =
    isAvailableBalanceReady && !Number(availableBalance || 0);

  // A user who already holds spot/staked value that hasn't rolled into
  // accountValue/displayValue yet must not see the new-user guide again.
  const isNewUser = useMemo(
    () => hasNoBalance && !Number(accountValue || 0) && !(displayValue ?? 0),
    [hasNoBalance, accountValue, displayValue]
  );

  const [newUserGuideDismissed, setNewUserGuideDismissed] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    wallet
      .getHasDismissedNewUserGuideV2()
      .then((dismissed) => {
        if (!isCancelled) {
          setNewUserGuideDismissed(!!dismissed);
        }
      })
      .catch(() => {
        // Keep the guide hidden if the stored dismissal state cannot be read.
      });
    return () => {
      isCancelled = true;
    };
  }, [wallet]);

  const showNewUserGuide = isNewUser && !newUserGuideDismissed;

  const dismissNewUserGuide = () => {
    setNewUserGuideDismissed(true);
    Promise.resolve(wallet.setHasDismissedNewUserGuideV2(true)).catch(() => {
      // Local dismissal still applies for the current popup session.
    });
  };

  const handleDeposit = () => {
    if (currentPerpsAccount) {
      dispatch.account.changeAccountAsync(currentPerpsAccount);
    }
    onDeposit();
  };

  const handleWithdraw = () => {
    if (currentPerpsAccount) {
      dispatch.account.changeAccountAsync(currentPerpsAccount);
    }
    onWithdraw();
  };

  const { isDarkTheme } = useThemeMode();

  // Only the data state has a headline value. loading / error render a
  // skeleton or `--`, and the info icon + breakdown must agree with that —
  // liveValue can be a real figure while the portfolio fetch is still
  // failing, which would otherwise put a precise popover next to `--`.
  const headlineValue = viewState === 'data' ? displayValue ?? 0 : 0;

  // No info icon in the empty/zero state (matches the Figma empty-state
  // frame) or when there is nothing to break down — no spot asset at all
  // (mobile's hasNonPerpsAssets). isUserDataReady also guards the
  // account-switch window where clearinghouseState still holds the previous
  // account's numbers (see setCurrentPerpsAccount).
  const isUserDataReady = useRabbySelector((s) => s.perps.isUserDataReady);
  // A boolean that flips on balance changes, not on price ticks.
  const hasNonPerpsAssets = useRabbySelector((s) =>
    s.perps.spotState.balances.some((b) => Number(b.total) > 0)
  );
  const breakdownMode: PerpsBreakdownMode = isPortfolioMargin
    ? 'portfolioMargin'
    : isUnifiedAccount
    ? 'unified'
    : 'manual';
  const showBreakdown =
    hasNonPerpsAssets && headlineValue > 0 && isUserDataReady;

  const valueDisplay = useMemo(() => {
    if (viewState === 'loading') {
      return (
        <Skeleton.Input active className="w-[132px] h-[28px] rounded-[4px]" />
      );
    }
    if (viewState === 'error') return '--';
    if (viewState === 'zero') return '$0.00';
    return formatUsdValue(headlineValue, BigNumber.ROUND_DOWN);
  }, [viewState, headlineValue]);

  const change24hText = useMemo(() => {
    if (viewState === 'zero') return '+0%(+$0.00)';
    if (!change24h) return '';
    const sign = change24h.pnl < 0 ? '-' : '+';
    const amount = `${sign}${formatUsdValue(
      Math.abs(change24h.pnl),
      BigNumber.ROUND_DOWN
    )}`;
    if (change24h.percent == null) return amount;
    const percent = `${sign}${Math.abs(change24h.percent * 100).toFixed(2)}%`;
    return `${percent}(${amount})`;
  }, [viewState, change24h]);

  // The change row reads real history, so it only makes sense once there is
  // a committed value to compare against — hidden while loading/error. In
  // the data state it also needs a non-empty change24hText, otherwise a
  // fully-missing day series would render an orphan row with just "24H".
  const showChangeRow =
    viewState === 'zero' || (viewState === 'data' && !!change24hText);

  // Zero and positive both read as a gain (matches mobile).
  const isLoss = (change24h?.pnl ?? 0) < 0;

  // Memoized so a quote-price tick (which re-renders the whole Perps state
  // tree via usePerpsState's `state.perps` selector) doesn't force recharts
  // to redraw every frame — only real inputs to the chart do.
  const chart = useMemo(
    () => (
      <PerpsPortfolioChart
        data={portfolioData}
        expanded={expanded}
        isEmpty={viewState !== 'data'}
        period={expanded ? period : 'day'}
        onPeriodChange={setPeriod}
      />
    ),
    [portfolioData, expanded, viewState, period]
  );

  return (
    <>
      <div
        // No overflow-hidden here: the breakdown popover renders inside this
        // node (TooltipWithMagnetArrow's getPopupContainer returns the
        // trigger's parent) and must not be clipped. The bottom bar below
        // carries its own rounded-b corner instead.
        className="bg-r-neutral-card1 rounded-[8px]"
      >
        {/* The hover hot zone is this upper block only (headline + chart);
            the Available / deposit bar below never expands the card. */}
        <div
          className={clsx(
            'flex flex-col',
            expanded ? 'pt-16 px-16 pb-12 gap-[10px]' : 'p-16'
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div
            className={clsx(
              'flex',
              expanded ? 'flex-col' : 'items-center justify-between'
            )}
          >
            <div className="flex flex-col gap-8">
              {/* 标题行。TooltipWithMagnetArrow 要求触发元素的父级 position: relative；
                  Figma 的触发区是「文字 + info 图标」整体，hover 时整体变 r-blue-default，
                  所以两者包在同一个 span 里作为触发元素，色类放在 span 上让 -cc 图标继承。 */}
              <div className="flex items-center relative">
                <TooltipWithMagnetArrow
                  overlayClassName="rectangle perps-portfolio-breakdown"
                  // Popover flush with the label's left edge (Figma); the
                  // magnet arrow still points at the trigger's centre.
                  placement="bottomLeft"
                  title={
                    showBreakdown ? (
                      <PerpsPortfolioBreakdownTips
                        mode={breakdownMode}
                        portfolioValue={headlineValue}
                      />
                    ) : undefined
                  }
                >
                  <span
                    className={clsx(
                      'inline-flex items-center gap-4',
                      'text-[14px] font-medium leading-[18px] text-r-neutral-foot',
                      showBreakdown &&
                        'cursor-pointer hover:text-r-blue-default'
                    )}
                  >
                    {t('page.perps.PerpsCard.portfolioValue')}
                    {showBreakdown && (
                      <RcIconInfoCC className="w-[14px] h-[14px]" />
                    )}
                  </span>
                </TooltipWithMagnetArrow>
              </div>
              {/* 金额 */}
              <div className="text-[24px] font-bold leading-[28px] text-r-neutral-title-1">
                {valueDisplay}
              </div>
              {/* 涨跌行 — hidden while loading/error: there's no committed
                  value yet to compare against. */}
              {showChangeRow && (
                <div className="flex items-center gap-4 text-[12px] leading-[16px]">
                  <span
                    className={
                      isLoss ? 'text-r-red-default' : 'text-r-green-default'
                    }
                  >
                    {change24hText}
                  </span>
                  <span className="text-r-neutral-foot">24H</span>
                </div>
              )}
            </div>
            {!expanded &&
              (viewState === 'loading' ? (
                <Skeleton.Input
                  active
                  className="w-[140px] h-[60px] rounded-[4px]"
                />
              ) : (
                chart
              ))}
          </div>
          {/* The chart supplies its own `gap-[6px] w-full relative` wrapper in
              expanded mode (Task 7 revision), so no extra container here. */}
          {expanded && chart}
        </div>
        <div
          className={clsx(
            'bg-r-neutral-card3 px-16 py-8',
            'rounded-b-[8px]',
            'flex items-center justify-between',
            // Light mode splits the rows by card1 vs card3 alone (no line in
            // the Figma). card1/card3 are the same color in dark mode, so a
            // hairline stands in for the split there only.
            'dark:border-t dark:border-solid dark:border-rabby-neutral-line'
          )}
        >
          <div className="flex flex-col gap-2">
            <span className="text-[14px] font-medium leading-[18px] text-rb-neutral-secondary">
              {t('page.perps.PerpsCard.available')}
            </span>
            {isAvailableBalanceReady ? (
              <span className="text-[16px] font-bold leading-[20px] text-r-neutral-title-1">
                {formatUsdValue(availableBalance, BigNumber.ROUND_DOWN)}
              </span>
            ) : (
              // Never render a fake $0 before the slices Available depends on land.
              <Skeleton.Input
                active
                className="w-[84px] h-[20px] rounded-[4px]"
              />
            )}
          </div>
          {hasNoBalance ? (
            <div
              className="h-[36px] rounded-[8px] bg-r-blue-light1 text-r-blue-default
                        flex items-center justify-center gap-4 px-[9px] cursor-pointer
                        text-[14px] font-medium"
              onClick={handleDeposit}
            >
              <RcIconAddFunds className="w-[14px] h-[14px]" />
              {t('page.perps.addFunds')}
            </div>
          ) : (
            // 16px frame holding the Figma 12.6px / 1.8 stroke glyph.
            <div className="flex items-center gap-8">
              <div
                className="w-[36px] h-[36px] rounded-[8px] bg-r-blue-light1 text-r-blue-default
                          flex items-center justify-center cursor-pointer"
                onClick={handleDeposit}
              >
                <RcIconBalanceAdd className="w-[16px] h-[16px]" />
              </div>
              <div
                className="w-[36px] h-[36px] rounded-[8px] bg-r-blue-light1 text-r-blue-default
                          flex items-center justify-center cursor-pointer"
                onClick={handleWithdraw}
              >
                <RcIconBalanceMinus className="w-[16px] h-[16px]" />
              </div>
            </div>
          )}
        </div>
      </div>
      {showNewUserGuide && (
        <div
          className="bg-r-neutral-card1 rounded-[8px] px-16 py-18 mt-12 relative overflow-hidden cursor-pointer"
          onClick={onLearnMore}
        >
          <div
            className="absolute top-8 right-8 w-[16px] h-[16px] flex items-center justify-center cursor-pointer text-r-neutral-foot hover:text-r-blue-default z-10"
            onClick={(e) => {
              e.stopPropagation();
              dismissNewUserGuide();
            }}
          >
            <RcIconCloseCC className="w-[16px] h-[16px] " />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[20px] font-medium text-r-neutral-title-1">
                {t('page.perps.tradePerps')}
              </div>
              <div className="text-13 text-r-blue-default flex items-center font-medium">
                {t('page.perps.newUserGuide.learnMore')}
                <RcIconArrowRight className="w-[20px] h-[20px] text-r-blue-default" />
              </div>
            </div>
            <div className="relative w-[90px] h-[56px] shrink-0">
              <img
                src={isDarkTheme ? perpsGuideBgDark : perpsGuideBg}
                className="absolute bottom-0 right-0 w-[90px] h-[29px]"
              />
              {isDarkTheme ? (
                <RcIconPerpsGuideLogoDark className="absolute top-0 left-1/2 -translate-x-1/2 w-[56px] h-[56px]" />
              ) : (
                <RcIconPerpsGuideLogo className="absolute top-0 left-1/2 -translate-x-1/2 w-[56px] h-[56px]" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
