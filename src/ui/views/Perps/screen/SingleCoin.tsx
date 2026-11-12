import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { Button, Switch, message } from 'antd';
import clsx from 'clsx';
import { PerpsChart } from '../components/Chart';
import { PERPS_MAX_NTL_VALUE, PERPS_BUILDER_INFO } from '../constants';
import * as Sentry from '@sentry/browser';
import { useMemoizedFn } from 'ahooks';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { ReactComponent as RcIconTitleSelect } from 'ui/assets/perps/IconTitleSelect.svg';
import { ReactComponent as RcIconTitleSelectDark } from 'ui/assets/perps/IconTitleSelectDark.svg';
import { EditMarginPopup } from '../popup/EditMarginPopup';
import { RiskLevelPopup } from '../popup/RiskLevelPopup';
import { CancelOrderParams } from '@rabby-wallet/hyperliquid-sdk';
import { formatUsdValueKMB } from '../../Dashboard/components/TokenDetailPopup/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { PerpsOpenPositionPopup } from '../popup/OpenPositionPopup';
import { ClosePositionPopup } from '../popup/ClosePositionPopup';
import BigNumber from 'bignumber.js';
import { usePerpsPosition } from '../hooks/usePerpsPosition';
import HistoryContent from '../components/HistoryContent';
import { PerpsAbout } from '../components/PerpsAbout';
import { usePerpsDeposit } from '../hooks/usePerpsDeposit';
import { PerpsDepositAmountPopup } from '../popup/DepositAmountPopup';
import {
  DirectSubmitProvider,
  supportedDirectSign,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { TokenImg } from '../components/TokenImg';
import { TopPermissionTips } from '../components/TopPermissionTips';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ReactComponent as RcIconBackNew } from 'ui/assets/back-new.svg';
import { SearchPerpsPopup } from '../popup/SearchPerpsPopup';
import { markHomeScrollResetOnNextRestore } from './homeScrollState';
import { PerpsPositionSection } from '../components/PerpsPositionSection';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { ReactComponent as RcIconCollected } from '@/ui/assets/perps/IconCollected20.svg';
import { ReactComponent as RcIconNotCollected } from '@/ui/assets/perps/IconUnCollected20.svg';
import { RcIconJumpBoldCC } from '@/ui/assets/dashboard';
import { obj2query } from '@/ui/utils/url';
import { AddPositionPopup } from '../popup/AddPositionPopup';
import usePerpsState from '../hooks/usePerpsState';
import { MiniTypedDataApproval } from '../../Approval/components/MiniSignTypedData/MiniTypeDataApproval';
import { formatPerpsDexName } from '../../DesktopPerps/utils';
import { PerpsDisplayCoinName } from '../components/PerpsDisplayCoinName';
import { usePerpsAccount } from '../hooks/usePerpsAccount';
import { usePerpsActions } from '../hooks/usePerpsActions';
import { useActiveAssetSubscription } from '../hooks/useActiveAssetSubscription';
import { PerpsLimitOrdersSection } from '../components/PerpsLimitOrdersSection';
import { useDetailLimitOrders } from '../hooks/useLimitOrders';
import { resolveCrossMarginAvailableAfterMaintenance } from '../utils';
import { DistanceRiskTag } from '../../DesktopPerps/components/UserInfoHistory/PositionsInfo/DistanceRiskTag';
import { EnableUnifiedAccountPopup } from '../popup/EnableUnifiedAccountPopup';
import { SpotSwapPopup } from '../popup/SpotSwapPopup';
import { PerpsQuoteAsset, SWAP_REQUIRED_QUOTE_ASSETS } from '../constants';
import { KEYRING_TYPE } from '@/constant';

export const formatPercent = (value: number, decimals = 8) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const PerpsSingleCoin = () => {
  const { coin: _coin } = useParams<{ coin: string }>();
  const history = useHistory();
  const { t } = useTranslation();
  const { isDarkTheme } = useThemeMode();
  const dispatch = useRabbyDispatch();
  const {
    marketDataMap,
    perpFee,
    marketData,
    clearinghouseState,
    openOrders,
    favoritedCoins,
    marginModePreferences,
    dexClearinghouseStates,
    spotState,
    userAbstraction,
  } = useRabbySelector((state) => state.perps);
  const [coin, setCoin] = useState(_coin);
  const {
    accountValue,
    isUnifiedAccount,
    getAvailableByAsset,
  } = usePerpsAccount();
  const { handleEnableUnifiedAccount } = usePerpsActions();
  const [enableUnifiedVisible, setEnableUnifiedVisible] = useState(false);
  const [swapVisible, setSwapVisible] = useState(false);
  const [swapTargetAsset, setSwapTargetAsset] = useState<
    PerpsQuoteAsset | undefined
  >();

  const [amountVisible, setAmountVisible] = useState(false);
  const wallet = useWallet();
  const [isPreparingSign, setIsPreparingSign] = useState(false);

  const [searchPopupVisible, setSearchPopupVisible] = useState(false);
  const [positionDirection, setPositionDirection] = React.useState<
    'Long' | 'Short'
  >(() => {
    const params = new URLSearchParams(history.location.search);
    const dir = params.get('direction');
    return dir === 'Short' ? 'Short' : 'Long';
  });
  const [closePositionVisible, setClosePositionVisible] = React.useState(false);
  const [editMarginVisible, setEditMarginVisible] = useState(false);
  const [addPositionVisible, setAddPositionVisible] = useState(false);
  const [riskPopupVisible, setRiskPopupVisible] = useState(false);

  const isFavorited = useMemo(() => favoritedCoins.includes(coin), [
    favoritedCoins,
    coin,
  ]);

  const handleToggleFavorite = useMemoizedFn(() => {
    dispatch.perps.toggleFavoriteCoin(coin);
  });

  const toggleFavoriteForSearch = useMemoizedFn((coinName: string) => {
    dispatch.perps.toggleFavoriteCoin(coinName);
  });

  const positionAndOpenOrders = useMemo(() => {
    if (!clearinghouseState || !openOrders) {
      return [];
    }

    return clearinghouseState.assetPositions.map((position) => {
      return {
        ...position,
        openOrders: openOrders.filter(
          (item) => item.coin === position.position.coin
        ),
      };
    });
  }, [clearinghouseState, openOrders]);

  // 查找当前币种的仓位信息
  const currentPosition = useMemo(() => {
    return positionAndOpenOrders?.find(
      (asset) => asset.position.coin.toLowerCase() === coin?.toLowerCase()
    );
  }, [positionAndOpenOrders, coin]);

  const providerFee = React.useMemo(() => {
    return perpFee;
  }, [perpFee]);

  const currentAssetCtx = useMemo(() => {
    return marketDataMap[coin];
  }, [marketDataMap, coin]);

  const quoteAsset = currentAssetCtx?.quoteAsset as PerpsQuoteAsset | undefined;

  const unifiedEnableSourceRef = useRef<'swap' | 'other'>('swap');
  const needEnableUnifiedAccount = useMemo(
    () => !isUnifiedAccount && (!currentAssetCtx || !!currentAssetCtx.dexId),
    [isUnifiedAccount, currentAssetCtx]
  );
  const isSwapRequired = useMemo(
    () =>
      !!quoteAsset &&
      SWAP_REQUIRED_QUOTE_ASSETS.includes(quoteAsset) &&
      !!Number(accountValue),
    [quoteAsset, accountValue]
  );

  const gateUnifiedForNonDefaultDex = useCallback((): boolean => {
    if (needEnableUnifiedAccount) {
      unifiedEnableSourceRef.current = 'other';
      setEnableUnifiedVisible(true);
      return false;
    }
    return true;
  }, [needEnableUnifiedAccount]);

  const handleSwapEntry = useMemoizedFn(async () => {
    await handleActionApproveStatus();
    if (!isUnifiedAccount && !accountNeedApproveAgent) {
      unifiedEnableSourceRef.current = 'swap';
      setEnableUnifiedVisible(true);
      return;
    }
    setSwapTargetAsset(
      quoteAsset && quoteAsset !== 'USDC' ? quoteAsset : undefined
    );
    setSwapVisible(true);
  });

  const { tpPrice, slPrice, tpOid, slOid } = useMemo(() => {
    if (
      !currentPosition ||
      !currentPosition.openOrders ||
      !currentPosition.openOrders.length
    ) {
      return {
        tpPrice: undefined,
        slPrice: undefined,
        tpOid: undefined,
        slOid: undefined,
      };
    }

    const tpItem = currentPosition.openOrders.find(
      (order) =>
        order.orderType === 'Take Profit Market' &&
        order.isTrigger &&
        order.isPositionTpsl &&
        order.reduceOnly
    );

    const slItem = currentPosition.openOrders.find(
      (order) =>
        order.orderType === 'Stop Market' &&
        order.isTrigger &&
        order.isPositionTpsl &&
        order.reduceOnly
    );

    return {
      tpPrice: tpItem?.triggerPx,
      slPrice: slItem?.triggerPx,
      tpOid: tpItem?.oid,
      slOid: slItem?.oid,
    };
  }, [currentPosition]);
  const [currentTpOrSl, _setCurrentTpOrSl] = useState<{
    tpPrice?: string;
    slPrice?: string;
  }>({
    tpPrice: tpPrice,
    slPrice: slPrice,
  });
  const setCurrentTpOrSl = useMemoizedFn(
    (params: { tpPrice?: string; slPrice?: string }) => {
      _setCurrentTpOrSl((prev) => ({
        ...prev,
        ...params,
      }));
    }
  );
  useEffect(() => {
    setCurrentTpOrSl({ tpPrice, slPrice });
  }, [tpPrice, slPrice]);

  const {
    handleOpenPosition,
    handleClosePosition,
    handleSetAutoClose,
    handleUpdateMargin,
    handleUpdateMarginMode,
    handleCancelOrder,
    currentPerpsAccount,
    isLogin,
    userFills,
    hasPermission,
    handleActionApproveStatus,
    accountNeedApproveAgent,
    accountNeedApproveBuilderFee,
  } = usePerpsPosition({
    setCurrentTpOrSl,
  });

  const { activeAssetCtx, activeAssetData } = useActiveAssetSubscription(
    coin,
    currentPerpsAccount?.address
  );

  const detailLimitRows = useDetailLimitOrders(
    coin,
    activeAssetData?.leverage ?? null
  );

  const hasPosition = useMemo(() => {
    return !!currentPosition;
  }, [currentPosition]);

  const hasLimitOrders = detailLimitRows.length > 0;

  const marginModeDisabled = currentAssetCtx?.onlyIsolated;

  // Mirrors the server: HL's activeAssetData push is the source of truth, the
  // stored preference only fills the window before the first push lands.
  const marginMode: 'cross' | 'isolated' = marginModeDisabled
    ? 'isolated'
    : activeAssetData?.leverage?.type ??
      marginModePreferences[coin] ??
      'isolated';

  const handleMarginModeChange = useMemoizedFn(
    async (mode: 'cross' | 'isolated') => {
      if (mode === marginMode) return true;
      // updateLeverage writes mode and leverage together — reuse the pushed
      // leverage so switching mode never moves the user's leverage.
      const leverage = activeAssetData?.leverage?.value;
      if (!coin || !leverage) {
        // No push yet (fresh page, or mid coin-switch) — guessing a leverage
        // here would move the liquidation price, so bail out loudly instead.
        message.error({
          duration: 1.5,
          content: t('page.perps.marginModeSwitchFailed'),
        });
        return false;
      }
      const success = await handleUpdateMarginMode({
        coin,
        leverage,
        marginMode: mode,
      });
      if (success) {
        dispatch.perps.setMarginModePreference({ coin, mode });
      }
      return success;
    }
  );

  const availableBalance = useMemo(() => {
    if (activeAssetData?.availableToTrade) {
      const isShort = hasPosition && Number(currentPosition?.position.szi) < 0;

      // type availableToTrade : [longAvailable, shortAvailable]
      return Number(activeAssetData.availableToTrade[isShort ? 1 : 0]);
    }
    return getAvailableByAsset(quoteAsset || 'USDC') || 0;
  }, [
    activeAssetData?.availableToTrade,
    quoteAsset,
    getAvailableByAsset,
    hasPosition,
    currentPosition?.position.szi,
  ]);

  const crossMarginAvailable = useMemo(
    () =>
      resolveCrossMarginAvailableAfterMaintenance({
        dexState: dexClearinghouseStates?.[currentAssetCtx?.dexId ?? ''],
        quoteAsset,
        tokenToAvailableAfterMaintenance:
          spotState?.tokenToAvailableAfterMaintenance,
        userAbstraction,
      }),
    [
      dexClearinghouseStates,
      currentAssetCtx?.dexId,
      quoteAsset,
      spotState?.tokenToAvailableAfterMaintenance,
      userAbstraction,
    ]
  );

  const projectedPosition = useMemo(
    () =>
      currentPosition
        ? {
            entryPx: currentPosition.position.entryPx,
            marginUsed: currentPosition.position.marginUsed,
            szi: currentPosition.position.szi,
          }
        : null,
    [currentPosition]
  );

  const needDepositFirst = useMemo(() => {
    return (
      Number(accountValue || 0) === 0 && Number(availableBalance || 0) === 0
    );
  }, [accountValue, availableBalance]);

  const accountNeedApprove = useMemo(() => {
    return accountNeedApproveAgent || accountNeedApproveBuilderFee;
  }, [accountNeedApproveAgent, accountNeedApproveBuilderFee]);

  const isLocalWallet =
    currentPerpsAccount?.type === KEYRING_TYPE.HdKeyring ||
    currentPerpsAccount?.type === KEYRING_TYPE.SimpleKeyring;
  const hasAutoTriggeredApprove = React.useRef(false);
  useEffect(() => {
    if (hasAutoTriggeredApprove.current) return;
    if (!currentPerpsAccount || !accountNeedApprove || !isLocalWallet) return;
    hasAutoTriggeredApprove.current = true;
    handleActionApproveStatus().catch(() => {});
  }, [isLocalWallet, accountNeedApprove, handleActionApproveStatus]);

  const showOpenPosition = useMemo(() => {
    return history.location.search.includes('openPosition=true');
  }, []);

  const canOpenPosition =
    hasPermission &&
    !hasPosition &&
    !needDepositFirst &&
    !accountNeedApprove &&
    !needEnableUnifiedAccount &&
    showOpenPosition;

  const [openPositionVisible, setOpenPositionVisible] = React.useState(
    canOpenPosition
  );

  const {
    miniSignTx,
    clearMiniSignTx,
    updateMiniSignTx,
    handleDeposit,
    quoteLoading,
    handleSignDepositDirect,
    bridgeQuote,
    resetBridgeQuoteLoading,
  } = usePerpsDeposit({
    currentPerpsAccount,
    setAmountVisible,
  });

  const singleCoinHistoryList = useMemo(() => {
    return userFills
      .filter((fill) => fill.coin.toLowerCase() === coin?.toLowerCase())
      .sort((a, b) => b.time - a.time);
  }, [userFills, coin]);

  const canUseDirectSubmitTx = useMemo(
    () => supportedDirectSign(currentPerpsAccount?.type || ''),
    [currentPerpsAccount?.type]
  );
  const miniTxs = useMemo(() => {
    return miniSignTx || [];
  }, [miniSignTx]);

  const markPrice = useMemo(() => {
    return Number(activeAssetCtx?.markPx || currentAssetCtx?.markPx || 0);
  }, [activeAssetCtx]);

  // Position data if exists
  const positionData = useMemo(
    () =>
      currentPosition
        ? {
            pnl: Number(currentPosition.position.unrealizedPnl || 0),
            positionValue: Number(currentPosition.position.positionValue || 0),
            size: Math.abs(Number(currentPosition.position.szi || 0)),
            marginUsed: Number(currentPosition.position.marginUsed || 0),
            side:
              Number(currentPosition.position.szi || 0) > 0 ? 'Long' : 'Short',
            type: currentPosition.position.leverage.type,
            leverage: Number(currentPosition.position.leverage.value || 1),
            entryPrice: Number(currentPosition.position.entryPx || 0),
            liquidationPrice: Number(
              currentPosition.position.liquidationPx || 0
            ).toFixed(currentAssetCtx?.pxDecimals ?? 2),
            autoClose: false, // This would come from SDK
            direction: (Number(currentPosition.position.szi || 0) > 0
              ? 'Long'
              : 'Short') as 'Long' | 'Short',
            pnlPercent:
              Number(currentPosition.position.returnOnEquity || 0) * 100,
            fundingPayments: currentPosition.position.cumFunding.sinceOpen,
          }
        : null,
    [currentPosition, currentAssetCtx]
  );

  const handleCancelAutoClose = useMemoizedFn(
    async (actionType: 'tp' | 'sl') => {
      if (actionType === 'tp') {
        if (tpOid) {
          setCurrentTpOrSl({
            tpPrice: undefined,
          });
          await handleCancelOrder(tpOid, coin, 'tp');
        } else {
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: 'Take profit not found',
          });
        }
      } else if (actionType === 'sl') {
        if (slOid) {
          setCurrentTpOrSl({
            slPrice: undefined,
          });
          await handleCancelOrder(slOid, coin, 'sl');
        } else {
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: 'Stop loss not found',
          });
        }
      }
    }
  );
  const needHiddenAccountCard = useMemo(() => {
    const dexName = formatPerpsDexName(coin);
    // exist dex need approval account agent so can enable unified account
    if (
      accountNeedApprove &&
      !isLocalWallet &&
      dexName &&
      !isUnifiedAccount &&
      !needDepositFirst
    ) {
      return true;
    } else {
      return false;
    }
  }, [
    accountNeedApprove,
    coin,
    isUnifiedAccount,
    needDepositFirst,
    isLocalWallet,
  ]);

  const HeaderRightSlot = useMemo(() => {
    return (
      <div className="flex items-center gap-12">
        <div
          className="w-24 h-24 cursor-pointer flex items-center justify-center text-r-neutral-body hover:text-r-blue-default"
          onClick={(e) => {
            e.stopPropagation();
            if (currentPerpsAccount) {
              wallet.setPerpsCurrentAccount(currentPerpsAccount);
              wallet.switchDesktopPerpsAccount(currentPerpsAccount);
            }
            wallet.openInDesktop(`/desktop/perps?${obj2query({ coin })}`);
          }}
        >
          <RcIconJumpBoldCC />
        </div>
        <div
          className="cursor-pointer flex items-center"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite();
          }}
        >
          {/* SVGR drops viewBox: keep it so the 20px star scales to 24px. */}
          {isFavorited ? (
            <RcIconCollected viewBox="0 0 20 20" className="w-24 h-24" />
          ) : (
            <RcIconNotCollected viewBox="0 0 20 20" className="w-24 h-24" />
          )}
        </div>
      </div>
    );
  }, [isFavorited, handleToggleFavorite, wallet, currentPerpsAccount, coin]);

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <div className="h-[56px] px-20 flex items-center justify-between gap-12 flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="hit-slop-8 relative flex items-center cursor-pointer"
            onClick={() => history.goBack()}
          >
            <ThemeIcon src={RcIconBackNew} className="w-20 h-20" />
          </div>
          <div
            className="flex items-center gap-[3px] min-w-0 cursor-pointer"
            onClick={() => {
              setSearchPopupVisible(true);
            }}
          >
            <div className="flex items-center gap-8 min-w-0">
              <TokenImg logoUrl={currentAssetCtx?.logoUrl} size={24} />
              <PerpsDisplayCoinName
                item={currentAssetCtx}
                className="text-20 leading-[24px] font-medium whitespace-nowrap"
              />
            </div>
            <ThemeIcon
              className="icon text-r-neutral-title-1 flex-shrink-0"
              src={isDarkTheme ? RcIconTitleSelectDark : RcIconTitleSelect}
            />
          </div>
        </div>
        {HeaderRightSlot}
      </div>

      {!hasPermission ? <TopPermissionTips /> : null}
      <div className="flex-1 overflow-auto mx-20 pb-[40px]">
        {/* Price Chart Section */}
        <PerpsChart
          // key={coin}
          lineTagInfo={{
            tpPrice: Number(currentTpOrSl.tpPrice || 0),
            slPrice: Number(currentTpOrSl.slPrice || 0),
            liquidationPrice: Number(
              currentPosition?.position.liquidationPx || 0
            ),
            entryPrice: Number(currentPosition?.position.entryPx || 0),
          }}
          coin={coin}
          markPrice={markPrice}
          activeAssetCtx={activeAssetCtx}
          currentAssetCtx={currentAssetCtx}
        />

        {/* Available to Trade */}
        {!hasPosition && !needHiddenAccountCard && (
          <div className="flex justify-between items-center text-15 text-r-neutral-title-1 font-medium pt-12 bg-r-neutral-card1 rounded-[12px] p-16">
            <span>
              {t('page.perps.availableToTrade')}:{' '}
              {formatUsdValue(availableBalance, BigNumber.ROUND_DOWN)}
            </span>
            <div
              className="text-r-blue-default text-13 cursor-pointer px-16 py-10 rounded-[8px] bg-r-blue-light-1"
              onClick={() => {
                if (!needDepositFirst && !gateUnifiedForNonDefaultDex()) {
                  return;
                }

                if (isSwapRequired) {
                  handleSwapEntry();
                } else {
                  setAmountVisible(true);
                }
              }}
            >
              {isSwapRequired
                ? t('page.perps.PerpsDepositCard.swap')
                : t('page.perps.deposit')}
            </div>
          </div>
        )}

        {hasPosition && isLogin && positionData && (
          <PerpsPositionSection
            coin={coin}
            positionData={positionData}
            rawLiquidationPrice={currentPosition?.position.liquidationPx}
            markPrice={markPrice}
            tpPrice={currentTpOrSl.tpPrice}
            slPrice={currentTpOrSl.slPrice}
            currentAssetCtx={currentAssetCtx}
            activeAssetCtx={activeAssetCtx}
            handleActionApproveStatus={handleActionApproveStatus}
            onEditMargin={async () => {
              await handleActionApproveStatus();
              setEditMarginVisible(true);
            }}
            onSetAutoClose={async ({ tpTriggerPx, slTriggerPx }) => {
              await handleSetAutoClose({
                coin,
                tpTriggerPx,
                slTriggerPx,
                direction: positionData.direction,
              });
            }}
            onCancelAutoClose={handleCancelAutoClose}
          />
        )}

        <PerpsLimitOrdersSection
          rows={detailLimitRows}
          marketDataMap={marketDataMap}
          className="mt-16"
          disableCoinNavigation
        />

        {!hasPosition && !hasLimitOrders && (
          <div className="mt-16">
            <PerpsAbout coin={coin} />
          </div>
        )}

        {/* Market Info Section */}
        <div className="text-15 font-medium text-r-neutral-title-1 mt-24 mb-8 flex gap-4 items-center">
          <span className="w-[2px] h-[12px] bg-r-blue-default inline-block" />
          {t('page.perps.info')}
        </div>
        <div className="bg-r-neutral-card1 rounded-[12px] px-16">
          <div className="flex justify-between text-13 py-16">
            <span className="text-r-neutral-body">
              {t('page.perps.dailyVolume')}
            </span>
            <span className="text-r-neutral-title-1 font-medium">
              {formatUsdValueKMB(Number(currentAssetCtx?.dayNtlVlm || 0))}
            </span>
          </div>

          <div className="flex justify-between text-13 py-16">
            <div className="text-r-neutral-body flex items-center gap-4 relative">
              {t('page.perps.openInterest')}
              <TooltipWithMagnetArrow
                overlayClassName="rectangle w-[max-content]"
                placement="top"
                title={t('page.perps.singleCoin.openInterestTips')}
              >
                <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
              </TooltipWithMagnetArrow>
            </div>
            <span className="text-r-neutral-title-1 font-medium">
              {formatUsdValueKMB(
                Number(currentAssetCtx?.openInterest || 0) *
                  Number(currentAssetCtx?.markPx || 0)
              )}
            </span>
          </div>

          <div className="flex justify-between text-13 py-16">
            <div className="text-r-neutral-body flex items-center gap-4 relative">
              {t('page.perps.fundingRate')}
              <TooltipWithMagnetArrow
                overlayClassName="rectangle w-[max-content]"
                placement="top"
                title={t('page.perps.singleCoin.fundingTips')}
              >
                <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
              </TooltipWithMagnetArrow>
            </div>
            <span className="text-r-neutral-title-1 font-medium">
              {formatPercent(Number(currentAssetCtx?.funding || 0), 6)}
            </span>
          </div>
        </div>

        {isLogin ? (
          <HistoryContent
            marketData={marketDataMap}
            historyData={singleCoinHistoryList}
            coin={coin}
          />
        ) : (
          <div className="h-[20px]" />
        )}

        {(hasPosition || hasLimitOrders) && (
          <div className="mb-16">
            <PerpsAbout coin={coin} />
          </div>
        )}

        {/* <div
          className="text-r-neutral-foot mb-20"
          style={{ fontSize: '11px', lineHeight: '16px' }}
        >
          {t('page.perps.openPositionTips')}
        </div> */}

        {isLogin && (
          <>
            <div className="h-[40px]"></div>
            <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-r-neutral-bg2">
              {hasPosition ? (
                hasPermission ? (
                  <div className="flex gap-12 justify-center">
                    <Button
                      block
                      size="large"
                      className={clsx(
                        'h-[48px] text-15 font-medium rounded-[8px] ',
                        'flex-1 bg-transparent text-r-blue-default border border-rabby-blue-default',
                        'before:content-none'
                      )}
                      onClick={async () => {
                        await handleActionApproveStatus();
                        setAddPositionVisible(true);
                      }}
                    >
                      {t('page.perps.add')}
                    </Button>
                    <Button
                      block
                      type="primary"
                      size="large"
                      className="flex-1 h-[48px] bg-blue-500 border-blue-500 text-white text-15 font-medium rounded-[8px]"
                      onClick={async () => {
                        await handleActionApproveStatus();
                        setClosePositionVisible(true);
                      }}
                    >
                      {t('page.perps.close')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    block
                    type="primary"
                    size="large"
                    className="h-[48px] bg-blue-500 border-blue-500 text-white text-15 font-medium rounded-[8px]"
                    onClick={async () => {
                      await handleActionApproveStatus();
                      setClosePositionVisible(true);
                    }}
                  >
                    {t('page.perps.close')}
                  </Button>
                )
              ) : hasPermission ? (
                <div className="flex gap-12 justify-center">
                  <Button
                    size="large"
                    type="primary"
                    className="h-[48px] border-none text-15 font-medium rounded-[8px] flex-1 bg-r-green-default text-r-neutral-title-2"
                    onClick={async () => {
                      if (needDepositFirst) {
                        message.error(t('page.perpsDetail.needDepositFirst'));
                        return;
                      }

                      if (!gateUnifiedForNonDefaultDex()) {
                        return;
                      }

                      await handleActionApproveStatus();
                      setPositionDirection('Long');
                      setOpenPositionVisible(true);
                    }}
                  >
                    {t('page.perps.long')}
                  </Button>
                  <Button
                    size="large"
                    type="primary"
                    className="h-[48px] border-none text-15 font-medium rounded-[8px] flex-1 bg-r-red-default text-r-neutral-title-2 "
                    onClick={async () => {
                      if (needDepositFirst) {
                        message.error(t('page.perpsDetail.needDepositFirst'));
                        return;
                      }

                      if (!gateUnifiedForNonDefaultDex()) {
                        return;
                      }
                      await handleActionApproveStatus();
                      setPositionDirection('Short');
                      setOpenPositionVisible(true);
                    }}
                  >
                    {t('page.perps.short')}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-12 items-center text-13 justify-center text-r-neutral-body font-medium bg-r-neutral-line rounded-[8px] h-[48px]">
                  {t('page.perps.permissionTips')}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <PerpsOpenPositionPopup
        currentAssetCtx={currentAssetCtx}
        activeAssetCtx={activeAssetCtx}
        visible={openPositionVisible}
        direction={positionDirection}
        maxNtlValue={Number(
          currentAssetCtx?.maxUsdValueSize || PERPS_MAX_NTL_VALUE
        )}
        coin={coin}
        pxDecimals={currentAssetCtx?.pxDecimals ?? 2}
        szDecimals={currentAssetCtx?.szDecimals || 0}
        leverageRange={[1, currentAssetCtx?.maxLeverage || 5]}
        defaultLeverage={activeAssetData?.leverage?.value}
        markPrice={markPrice}
        marginMode={marginMode}
        onMarginModeChange={handleMarginModeChange}
        hasPosition={hasPosition}
        availableBalance={Number(availableBalance || 0)}
        crossMarginAvailable={crossMarginAvailable}
        projectedPosition={projectedPosition}
        quoteAsset={quoteAsset}
        onDepositPress={() => {
          setAmountVisible(true);
        }}
        onSwapPress={() => {
          handleSwapEntry();
        }}
        onCancel={() => setOpenPositionVisible(false)}
        handleOpenPosition={(params) =>
          handleOpenPosition({
            ...params,
            dex: currentAssetCtx?.dexId ?? '',
          })
        }
        onConfirm={() => {
          setOpenPositionVisible(false);
          markHomeScrollResetOnNextRestore();
          history.goBack();
        }}
      />

      <ClosePositionPopup
        visible={closePositionVisible}
        coin={coin}
        providerFee={providerFee}
        direction={positionData?.direction as 'Long' | 'Short'}
        positionSize={positionData?.size.toString() || '0'}
        pnl={positionData?.pnl || 0}
        onCancel={() => setClosePositionVisible(false)}
        quoteAsset={quoteAsset}
        markPrice={markPrice}
        entryPrice={positionData?.entryPrice || 0}
        szDecimals={currentAssetCtx?.szDecimals || 0}
        currentAssetCtx={currentAssetCtx}
        onConfirm={() => {
          setClosePositionVisible(false);
        }}
        handleClosePosition={async ({ closePercent, orderType, limitPx }) => {
          let sizeStr = '0';
          if (closePercent < 100) {
            const size = (Number(positionData?.size || 0) * closePercent) / 100;
            sizeStr = size.toFixed(currentAssetCtx?.szDecimals || 0);
          } else {
            sizeStr = positionData?.size.toString() || '0';
          }
          await handleClosePosition({
            coin,
            dex: currentAssetCtx?.dexId ?? '',
            size: sizeStr,
            direction: positionData?.direction as 'Long' | 'Short',
            price: activeAssetCtx?.markPx || currentAssetCtx?.markPx || '0',
            orderType,
            limitPx,
          });
        }}
      />

      <PerpsDepositAmountPopup
        visible={amountVisible}
        resetBridgeQuoteLoading={resetBridgeQuoteLoading}
        quoteLoading={quoteLoading}
        bridgeQuote={bridgeQuote}
        miniTxs={miniTxs}
        setIsPreparingSign={setIsPreparingSign}
        isPreparingSign={isPreparingSign}
        currentPerpsAccount={currentPerpsAccount}
        updateMiniSignTx={updateMiniSignTx}
        handleDeposit={handleDeposit}
        clearMiniSignTx={clearMiniSignTx}
        onClose={() => {
          setAmountVisible(false);
          clearMiniSignTx();
          setIsPreparingSign(false);
        }}
        handleSignDepositDirect={handleSignDepositDirect}
      />

      <SearchPerpsPopup
        visible={searchPopupVisible}
        onCancel={() => setSearchPopupVisible(false)}
        onSelect={(coin) => {
          setCoin(coin);
          setSearchPopupVisible(false);
        }}
        openFromSource="searchPerps"
        marketData={marketData}
        favoritedCoins={favoritedCoins}
      />

      <EnableUnifiedAccountPopup
        visible={enableUnifiedVisible}
        onCancel={() => setEnableUnifiedVisible(false)}
        onConfirm={async () => {
          const ok = await handleEnableUnifiedAccount();
          if (ok) {
            setEnableUnifiedVisible(false);
            if (unifiedEnableSourceRef.current === 'swap') {
              setSwapVisible(true);
            }
            return false;
          }
          return ok;
        }}
      />
      <SpotSwapPopup
        visible={swapVisible}
        targetAsset={swapTargetAsset}
        onDeposit={() => {
          // Stack deposit on top — keep swap popup (and its form state)
          // mounted so the user can return after deposit closes. Do NOT
          // reset swapTargetAsset for the same reason — it would re-seed
          // the swap form.
          setAmountVisible(true);
        }}
        disableSwitch={!!swapTargetAsset}
        onCancel={() => {
          setSwapVisible(false);
          setSwapTargetAsset(undefined);
        }}
      />

      {hasPosition && positionData && (
        <>
          <EditMarginPopup
            visible={editMarginVisible}
            coin={coin}
            leverageType={
              currentPosition?.position.leverage.type === 'cross'
                ? 'cross'
                : 'isolated'
            }
            currentAssetCtx={currentAssetCtx}
            activeAssetCtx={activeAssetCtx}
            direction={positionData.direction as 'Long' | 'Short'}
            entryPrice={positionData.entryPrice}
            leverage={positionData.leverage}
            availableBalance={Number(availableBalance || 0)}
            liquidationPx={Number(currentPosition?.position.liquidationPx || 0)}
            positionSize={positionData.size}
            marginUsed={positionData.marginUsed}
            pnlPercent={positionData.pnlPercent}
            pnl={positionData.pnl}
            handlePressRiskTag={() => setRiskPopupVisible(true)}
            onCancel={() => setEditMarginVisible(false)}
            onConfirm={async (action: 'add' | 'reduce', margin: number) => {
              await handleUpdateMargin(
                coin,
                currentAssetCtx?.dexId ?? '',
                action,
                margin
              );
              setEditMarginVisible(false);
            }}
          />

          <RiskLevelPopup
            direction={positionData.direction as 'Long' | 'Short'}
            pxDecimals={currentAssetCtx?.pxDecimals ?? 2}
            visible={riskPopupVisible}
            liquidationPrice={Number(
              currentPosition?.position.liquidationPx || 0
            )}
            markPrice={markPrice}
            onClose={() => setRiskPopupVisible(false)}
          />

          <AddPositionPopup
            visible={addPositionVisible}
            coin={coin}
            leverageType={
              currentPosition?.position.leverage.type === 'cross'
                ? 'cross'
                : 'isolated'
            }
            currentAssetCtx={currentAssetCtx}
            activeAssetCtx={activeAssetCtx}
            direction={positionData.direction as 'Long' | 'Short'}
            leverage={positionData.leverage}
            availableBalance={Number(availableBalance || 0)}
            crossMarginAvailable={crossMarginAvailable}
            projectedPosition={projectedPosition}
            liquidationPx={Number(currentPosition?.position.liquidationPx || 0)}
            positionSize={positionData.size}
            marginUsed={positionData.marginUsed}
            pnlPercent={positionData.pnlPercent}
            pnl={positionData.pnl}
            handlePressRiskTag={() => setRiskPopupVisible(true)}
            quoteAsset={quoteAsset}
            onDepositPress={() => {
              // Stack deposit on top — keep add-position popup mounted.
              setAmountVisible(true);
            }}
            onSwapPress={() => {
              // Stack swap on top — keep add-position popup mounted.
              handleSwapEntry();
            }}
            onCancel={() => setAddPositionVisible(false)}
            onConfirm={async (tradeSize) => {
              const res = await handleOpenPosition({
                coin,
                dex: currentAssetCtx?.dexId ?? '',
                size: tradeSize,
                leverage: positionData?.leverage || 1,
                direction: positionData?.direction as 'Long' | 'Short',
                midPx: activeAssetCtx?.markPx || '0',
                isAddPosition: true,
              });
              if (res) {
                markHomeScrollResetOnNextRestore();
              }
              setAddPositionVisible(false);
            }}
            leverageRange={[1, currentAssetCtx?.maxLeverage || 5]}
            markPrice={markPrice}
          />
        </>
      )}
    </div>
  );
};

const PerpsSingleCoinWrapper = () => {
  return (
    <DirectSubmitProvider>
      <PerpsSingleCoin />
    </DirectSubmitProvider>
  );
};

export default PerpsSingleCoinWrapper;
