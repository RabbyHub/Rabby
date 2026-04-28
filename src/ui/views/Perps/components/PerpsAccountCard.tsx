import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import BigNumber from 'bignumber.js';
import { Account } from '@/background/service/preference';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { useRabbyDispatch } from '@/ui/store';
import { usePerpsAccount } from '../hooks/usePerpsAccount';
import {
  ALL_PERPS_QUOTE_ASSETS,
  PerpsQuoteAsset,
  PERPS_LOW_BALANCE_THRESHOLD,
  getSpotBalanceKey,
} from '../constants';
import { QUOTE_ASSET_ICON_MAP } from './quoteAssetIcons';
import { ReactComponent as RcIconBalanceAdd } from '@/ui/assets/perps/IconBalanceAdd.svg';
import { ReactComponent as RcIconBalanceMinus } from '@/ui/assets/perps/IconBalanceMinus.svg';
import { ReactComponent as RcIconAddFunds } from '@/ui/assets/perps/IconAddFunds.svg';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { ReactComponent as RcIconArrowDownCC } from '@/ui/assets/perps/IconArrowDownCC.svg';
import { ReactComponent as RcIconArrowDownDark } from '@/ui/assets/perps/IconArrowDownDark.svg';
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
  onSwap,
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const {
    accountValue,
    availableBalance,
    isUnifiedAccount,
    spotBalancesMap,
  } = usePerpsAccount();

  const visibleStableBalances = useMemo(() => {
    if (!isUnifiedAccount) return [];
    return ALL_PERPS_QUOTE_ASSETS.map((coin) => {
      const item = spotBalancesMap[getSpotBalanceKey(coin)];
      return { coin, available: Number(item?.available || 0) };
    })
      .filter((b) => b.available >= PERPS_LOW_BALANCE_THRESHOLD)
      .sort((a, b) => b.available - a.available);
  }, [isUnifiedAccount, spotBalancesMap]);

  const [isBalanceExpanded, setIsBalanceExpanded] = useState(false);
  const showChips =
    isUnifiedAccount && visibleStableBalances.length > 0 && isBalanceExpanded;
  const canExpand = isUnifiedAccount;

  const hasNoBalance = useMemo(() => !Number(availableBalance || 0), [
    availableBalance,
  ]);

  const isNewUser = useMemo(() => hasNoBalance && !Number(accountValue || 0), [
    hasNoBalance,
    accountValue,
  ]);

  const [newUserGuideDismissed, setNewUserGuideDismissed] = useState(true);

  useEffect(() => {
    wallet.getHasDismissedNewUserGuideV2().then((dismissed) => {
      setNewUserGuideDismissed(!!dismissed);
    });
  }, [wallet]);

  const showNewUserGuide = isNewUser && !newUserGuideDismissed;

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

  const balanceDisplay = useMemo(() => {
    const value = Number(availableBalance || 0);
    if (!value) {
      return <span className="text-[28px] leading-[33px]">$0</span>;
    }
    const formatted = formatUsdValue(value, BigNumber.ROUND_DOWN);
    const dotIndex = formatted.indexOf('.');
    if (dotIndex === -1) {
      return <span className="text-[28px] leading-[33px]">{formatted}</span>;
    }
    return (
      <>
        <span className="text-[28px] leading-[33px]">
          {formatted.slice(0, dotIndex)}
        </span>
        <span className="text-[20px] font-semibold leading-[33px]">
          {formatted.slice(dotIndex)}
        </span>
      </>
    );
  }, [availableBalance]);

  return (
    <>
      <div className="bg-r-neutral-card1 rounded-[8px] p-[16px]">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="font-bold text-r-neutral-title-1">
              {balanceDisplay}
            </div>
            <div
              className={clsx(
                'flex items-center gap-2 text-[13px] leading-[16px] text-r-neutral-foot mt-[4px]',
                canExpand && 'cursor-pointer'
              )}
              onClick={() => {
                if (canExpand) setIsBalanceExpanded((v) => !v);
              }}
            >
              {t('page.perpsDetail.PerpsOpenPositionPopup.available')}
              {canExpand &&
                (isDarkTheme ? (
                  <RcIconArrowDownDark
                    className={clsx(
                      'transition-transform',
                      isBalanceExpanded && '-rotate-180'
                    )}
                  />
                ) : (
                  <RcIconArrowDownCC
                    className={clsx(
                      'text-r-neutral-foot transition-transform',
                      isBalanceExpanded && '-rotate-180'
                    )}
                  />
                ))}
            </div>
          </div>
          {hasNoBalance ? (
            <div
              className={clsx(
                'h-[40px] rounded-[8px] flex items-center justify-center gap-4 px-12',
                'bg-r-blue-light1 hover:border-rabby-blue-default',
                'text-r-blue-default text-[13px] font-medium',
                'border-[1px] border-solid border-transparent cursor-pointer'
              )}
              onClick={handleDeposit}
            >
              <RcIconAddFunds className="w-[15px] h-[15px]" />
              {t('page.perps.addFunds')}
            </div>
          ) : (
            <div className="flex items-center gap-12">
              <div
                className={clsx(
                  'w-[46px] h-[40px] rounded-[6px] flex items-center justify-center',
                  'bg-r-blue-light1 hover:border-rabby-blue-default',
                  'text-r-blue-default',
                  'border-[1px] border-solid border-transparent cursor-pointer'
                )}
                onClick={handleDeposit}
              >
                <RcIconBalanceAdd className="w-[20px] h-[20px]" />
              </div>
              <div
                className={clsx(
                  'w-[46px] h-[40px] rounded-[6px] flex items-center justify-center',
                  'bg-r-blue-light1 hover:border-rabby-blue-default',
                  'text-r-blue-default',
                  'border-[1px] border-solid border-transparent cursor-pointer'
                )}
                onClick={handleWithdraw}
              >
                <RcIconBalanceMinus className="w-[20px] h-[20px]" />
              </div>
            </div>
          )}
        </div>
        {showChips && (
          <div
            className={clsx(
              'mt-12 flex items-center justify-between gap-8',
              'bg-r-neutral-bg2 rounded-[8px] px-12 h-[36px]'
            )}
          >
            <div className="flex items-center gap-12 min-w-0 flex-1">
              {visibleStableBalances.map((b) => {
                const Icon = QUOTE_ASSET_ICON_MAP[b.coin];
                return (
                  <div
                    key={b.coin}
                    className="inline-flex items-center gap-4 text-12 font-medium text-r-neutral-title-1"
                  >
                    <Icon className="w-[16px] h-[16px]" />
                    <span>
                      {formatUsdValue(b.available, BigNumber.ROUND_DOWN)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div
              className="text-12 font-medium text-r-blue-default cursor-pointer flex-shrink-0 flex items-center gap-2"
              onClick={() => onSwap?.()}
            >
              {t('page.perps.PerpsSpotSwap.toSwapEntry')}
            </div>
          </div>
        )}
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
              setNewUserGuideDismissed(true);
              wallet.setHasDismissedNewUserGuideV2(true);
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
            <div className="relative w-[90px] h-[56px] flex-shrink-0">
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
