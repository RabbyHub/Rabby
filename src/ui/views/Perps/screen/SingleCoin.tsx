import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useParams, useHistory } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep, useWallet } from '@/ui/utils';
import { Button, Switch, Tooltip, message } from 'antd';
import clsx from 'clsx';
import { PerpsChart } from '../components/Chart';
import { PERPS_MAX_NTL_VALUE, PERPS_BUILDER_INFO } from '../constants';
import * as Sentry from '@sentry/browser';
import { useMemoizedFn } from 'ahooks';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { ReactComponent as RcIconEdit } from 'ui/assets/perps/IconEditCC.svg';
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
import { SearchPerpsPopup } from '../popup/SearchPerpsPopup';
import { EditTpSlTag } from '../components/EditTpSlTag';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { ReactComponent as RcIconArrow } from '@/ui/assets/perps/polygon-cc.svg';
import { ReactComponent as RcIconCollected } from '@/ui/assets/perps/IconCollected.svg';
import { ReactComponent as RcIconNotCollected } from '@/ui/assets/perps/IconUnCollected.svg';
import { AddPositionPopup } from '../popup/AddPositionPopup';
import usePerpsState from '../hooks/usePerpsState';
import { MiniTypedDataApproval } from '../../Approval/components/MiniSignTypedData/MiniTypeDataApproval';
import {
  formatPerpsCoin,
  formatPerpsDexName,
  getStatsReportSide,
  handleDisplayFundingPayments,
} from '../../DesktopPerps/utils';
import { PerpsDisplayCoinName } from '../components/PerpsDisplayCoinName';
import stats from '@/stats';
import { usePerpsAccount } from '../hooks/usePerpsAccount';
import { usePerpsActions } from '../hooks/usePerpsActions';
import { useActiveAssetSubscription } from '../hooks/useActiveAssetSubscription';
import { calculateDistanceToLiquidation, formatPerpsPct } from '../utils';
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
  const [marginMode, setMarginMode] = useState<'cross' | 'isolated'>(
    'isolated'
  );

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

  const needEnableUnifiedAccount = useMemo(
    () => !isUnifiedAccount && !!quoteAsset && quoteAsset !== 'USDC',
    [isUnifiedAccount, quoteAsset]
  );
  const isSwapRequired = useMemo(
    () =>
      !!quoteAsset &&
      SWAP_REQUIRED_QUOTE_ASSETS.includes(quoteAsset) &&
      !!Number(accountValue),
    [quoteAsset, accountValue]
  );

  const handleSwapEntry = useMemoizedFn(async () => {
    await handleActionApproveStatus();
    if (!isUnifiedAccount && !accountNeedApproveAgent) {
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
  const {
    handleOpenPosition,
    handleClosePosition,
    handleSetAutoClose,
    handleUpdateMargin,
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

  const hasPosition = useMemo(() => {
    return !!currentPosition;
  }, [currentPosition]);

  const marginModeDisabled = currentAssetCtx?.onlyIsolated;

  useEffect(() => {
    if (!coin) return;
    if (marginModeDisabled) {
      setMarginMode('isolated');
    } else {
      setMarginMode(marginModePreferences[coin] ?? 'isolated');
    }
  }, [coin, marginModePreferences, marginModeDisabled]);

  const handleMarginModeChange = useMemoizedFn((mode: 'cross' | 'isolated') => {
    setMarginMode(mode);
    if (coin) {
      dispatch.perps.setMarginModePreference({ coin, mode });
    }
  });

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
            ).toFixed(currentAssetCtx?.pxDecimals || 2),
            autoClose: false, // This would come from SDK
            direction:
              Number(currentPosition.position.szi || 0) > 0 ? 'Long' : 'Short',
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
  // Calculate expected PNL for take profit
  const takeProfitExpectedPnl = useMemo(() => {
    if (!tpPrice || !positionData) {
      return null;
    }
    const entryPrice = positionData.entryPrice;
    const size = positionData.size;
    const pnlUsdValue =
      positionData.direction === 'Long'
        ? (Number(tpPrice) - entryPrice) * size
        : (entryPrice - Number(tpPrice)) * size;
    return pnlUsdValue;
  }, [tpPrice, positionData]);

  // Calculate expected PNL for stop loss
  const stopLossExpectedPnl = useMemo(() => {
    if (!slPrice || !positionData) {
      return null;
    }
    const entryPrice = positionData.entryPrice;
    const size = positionData.size;
    const pnlUsdValue =
      positionData.direction === 'Long'
        ? (Number(slPrice) - entryPrice) * size
        : (entryPrice - Number(slPrice)) * size;
    return pnlUsdValue;
  }, [slPrice, positionData]);

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
      <div className="flex items-center justify-center">
        <div
          className="ml-8 cursor-pointer flex items-end"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFavorite();
          }}
        >
          {isFavorited ? <RcIconCollected /> : <RcIconNotCollected />}
        </div>
      </div>
    );
  }, [isFavorited, handleToggleFavorite]);

  const distancePercent = useMemo(() => {
    return formatPerpsPct(
      calculateDistanceToLiquidation(
        positionData?.liquidationPrice || 0,
        markPrice
      )
    );
  }, [positionData?.liquidationPrice, markPrice]);

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader
        className="mx-[20px] pt-[20px]"
        forceShowBack
        rightSlot={HeaderRightSlot}
      >
        <div className="flex items-center justify-center">
          <div
            className="flex items-center gap-8 cursor-pointer"
            style={{ width: 'fit-content' }}
            onClick={() => {
              setSearchPopupVisible(true);
            }}
          >
            <TokenImg logoUrl={currentAssetCtx?.logoUrl} size={24} />
            <PerpsDisplayCoinName
              item={currentAssetCtx}
              className="text-20 font-medium"
            />
            <ThemeIcon
              className="icon text-r-neutral-title-1"
              src={isDarkTheme ? RcIconTitleSelectDark : RcIconTitleSelect}
            />
          </div>
        </div>
      </PageHeader>

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

        {hasPosition && isLogin && (
          <>
            {/* Position Header */}
            <div className="flex items-center gap-6 mt-16 mb-8">
              <div className="text-15 font-medium text-r-neutral-title-1">
                {t('page.perps.position')}
              </div>
              <span
                className={clsx(
                  'text-[12px] font-medium px-4 h-[18px] flex items-center justify-center rounded-[4px]',
                  positionData?.direction === 'Long'
                    ? 'text-r-green-default bg-r-green-light'
                    : 'text-r-red-default bg-r-red-light'
                )}
              >
                {positionData?.direction} {positionData?.leverage}x
              </span>
              <span className="text-[12px] font-medium px-4 h-[18px] flex items-center justify-center rounded-[4px] bg-r-neutral-line text-r-neutral-foot gap-2">
                {positionData?.type === 'cross'
                  ? t('page.perps.cross')
                  : t('page.perps.isolated')}
                {positionData?.type === 'cross' && (
                  <Tooltip
                    overlayClassName="rectangle"
                    placement="bottom"
                    title={t('page.perps.crossMarginLiqPriceTip')}
                  >
                    <RcIconInfo
                      viewBox="0 0 14 14"
                      width={12}
                      height={12}
                      className="text-r-neutral-foot"
                    />
                  </Tooltip>
                )}
              </span>
            </div>

            {/* Position Summary */}
            <div className="bg-r-neutral-card1 rounded-[12px] px-16">
              <div className="flex flex-col items-center py-16">
                <div className="text-13 text-r-neutral-body mb-4">
                  {t('page.perps.unrealizedPnl')}
                </div>
                <div
                  className={clsx(
                    'text-20 font-bold',
                    positionData && positionData.pnl >= 0
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {positionData && positionData.pnl >= 0 ? '+' : '-'}$
                  {splitNumberByStep(
                    Math.abs(positionData?.pnl || 0).toFixed(2)
                  )}
                </div>
                <div className="text-13 text-r-neutral-body mt-4">
                  {t('page.perps.positionValue')}{' '}
                  <span className="text-r-neutral-title-1 font-bold">
                    {formatUsdValue(Number(positionData?.positionValue || 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-r-neutral-card1 rounded-[12px] px-16 mt-8">
              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.currentPrice')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  ${splitNumberByStep(markPrice)}
                </span>
              </div>

              <div className="flex text-13 py-16 flex-col gap-8">
                <div className="flex justify-between">
                  <div className="text-r-neutral-body flex items-center gap-4 relative">
                    {t('page.perps.liquidationPrice')}
                  </div>
                  <span className="text-r-neutral-title-1 font-medium">
                    ${splitNumberByStep(positionData?.liquidationPrice || 0)}
                  </span>
                </div>
                {!currentTpOrSl.slPrice && (
                  <div className="text-12 font-medium text-r-neutral-body rounded-[6px] bg-r-blue-light-1 text-r-blue-default py-[10px] flex items-baseline justify-center">
                    <Trans
                      i18nKey={
                        positionData?.direction === 'Long'
                          ? 'page.perps.liquidationDistanceDown'
                          : 'page.perps.liquidationDistanceUp'
                      }
                      values={{ percent: distancePercent }}
                      components={{
                        bold: <span className="text-[15px] font-bold mx-4" />,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="text-15 font-medium text-r-neutral-title-1 mt-16 mb-8">
              {t('page.perps.settings')}
            </div>
            <div className="bg-r-neutral-card1 rounded-[12px] px-16">
              <div className="flex justify-between text-13 py-12 group">
                <span className="text-r-neutral-body">
                  {positionData?.type === 'isolated'
                    ? t('page.perps.marginIsolated')
                    : t('page.perps.marginCross')}
                </span>
                {positionData?.type === 'isolated' ? (
                  <div
                    className="flex items-center justify-center gap-6 bg-r-blue-light-1 rounded-[8px] px-6 h-[26px] cursor-pointer"
                    onClick={async () => {
                      await handleActionApproveStatus();
                      setEditMarginVisible(true);
                    }}
                  >
                    <span className="text-r-blue-default font-bold text-13 font-medium">
                      $
                      {splitNumberByStep(
                        Number(positionData?.marginUsed || 0).toFixed(2)
                      )}
                    </span>
                    <RcIconEdit className="w-16 h-16 text-r-blue-default" />
                  </div>
                ) : (
                  <div className="flex items-center gap-8">
                    <span className="text-r-neutral-title-1 font-medium">
                      $
                      {splitNumberByStep(
                        Number(positionData?.marginUsed || 0).toFixed(2)
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="py-12 gap-[15px] flex flex-col">
                <div className="flex justify-between text-13">
                  <div className="text-r-neutral-body">
                    <div className="text-13 text-r-neutral-body">
                      {positionData?.direction === 'Long'
                        ? t(
                            'page.perpsDetail.PerpsOpenPositionPopup.takeProfitWhenPriceAbove'
                          )
                        : t(
                            'page.perpsDetail.PerpsOpenPositionPopup.takeProfitWhenPriceBelow'
                          )}
                    </div>
                  </div>
                  <EditTpSlTag
                    handleActionApproveStatus={handleActionApproveStatus}
                    coin={coin}
                    markPrice={markPrice}
                    initTpOrSlPrice={currentTpOrSl.tpPrice || ''}
                    direction={positionData?.direction as 'Long' | 'Short'}
                    size={Number(positionData?.size || 0)}
                    margin={Number(positionData?.marginUsed || 0)}
                    leverage={positionData?.leverage || 1}
                    liqPrice={Number(positionData?.liquidationPrice || 0)}
                    pxDecimals={currentAssetCtx?.pxDecimals || 2}
                    szDecimals={currentAssetCtx?.szDecimals || 0}
                    actionType="tp"
                    entryPrice={Number(positionData?.entryPrice || 0)}
                    type="hasPosition"
                    handleCancelAutoClose={async () => {
                      await handleCancelAutoClose('tp');
                    }}
                    handleSetAutoClose={async (price: string) => {
                      await handleSetAutoClose({
                        coin,
                        tpTriggerPx: price,
                        slTriggerPx: '',
                        direction: positionData?.direction as 'Long' | 'Short',
                      });
                      const isBuy = positionData?.direction === 'Long';
                      stats.report('perpsTradeHistory', {
                        created_at: new Date().getTime(),
                        user_addr: currentPerpsAccount?.address || '',
                        trade_type: 'popup has position set tp',
                        leverage: (positionData?.leverage || 1).toString(),
                        trade_side: getStatsReportSide(!isBuy, true),
                        margin_mode: marginMode,
                        coin,
                        size: (positionData?.size || 0).toString(),
                        price,
                        trade_usd_value: new BigNumber(price)
                          .times(positionData?.size || 0)
                          .toFixed(2),
                        service_provider: 'hyperliquid',
                        app_version: process.env.release || '0',
                        address_type: currentPerpsAccount?.type || '',
                      });
                    }}
                  />
                </div>

                {tpPrice && takeProfitExpectedPnl !== null && (
                  <div className="relative bg-r-neutral-card-2 rounded-[6px] mt-[-6px]">
                    <div className="absolute right-[28px] top-[-6px]">
                      <RcIconArrow className="text-r-neutral-card-2" />
                    </div>
                    <div className="flex items-center justify-between p-[12px]">
                      <div className="text-[12px] leading-[14px] text-r-neutral-body">
                        {t(
                          'page.perpsDetail.PerpsAutoCloseModal.takeProfitExpectedPNL'
                        )}
                        :
                      </div>
                      <div
                        className={clsx(
                          'text-[12px] leading-[14px] font-bold',
                          takeProfitExpectedPnl >= 0
                            ? 'text-r-green-default'
                            : 'text-r-red-default'
                        )}
                      >
                        {takeProfitExpectedPnl >= 0 ? '+' : '-'}
                        {formatUsdValue(Math.abs(takeProfitExpectedPnl))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="py-12 gap-[15px] flex flex-col">
                <div className="flex justify-between text-13">
                  <div className="text-r-neutral-body">
                    <div className="text-13 text-r-neutral-body">
                      {positionData?.direction === 'Long'
                        ? t(
                            'page.perpsDetail.PerpsOpenPositionPopup.stopLossWhenPriceBelow'
                          )
                        : t(
                            'page.perpsDetail.PerpsOpenPositionPopup.stopLossWhenPriceAbove'
                          )}
                    </div>
                  </div>
                  <EditTpSlTag
                    handleActionApproveStatus={handleActionApproveStatus}
                    coin={coin}
                    markPrice={markPrice}
                    entryPrice={Number(positionData?.entryPrice || 0)}
                    initTpOrSlPrice={currentTpOrSl.slPrice || ''}
                    direction={positionData?.direction as 'Long' | 'Short'}
                    size={Number(positionData?.size || 0)}
                    margin={Number(positionData?.marginUsed || 0)}
                    leverage={positionData?.leverage || 1}
                    liqPrice={Number(positionData?.liquidationPrice || 0)}
                    pxDecimals={currentAssetCtx?.pxDecimals || 2}
                    szDecimals={currentAssetCtx?.szDecimals || 0}
                    actionType="sl"
                    type="hasPosition"
                    handleCancelAutoClose={async () => {
                      await handleCancelAutoClose('sl');
                    }}
                    handleSetAutoClose={async (price: string) => {
                      await handleSetAutoClose({
                        coin,
                        tpTriggerPx: '',
                        slTriggerPx: price,
                        direction: positionData?.direction as 'Long' | 'Short',
                      });
                      const isBuy = positionData?.direction === 'Long';
                      stats.report('perpsTradeHistory', {
                        created_at: new Date().getTime(),
                        user_addr: currentPerpsAccount?.address || '',
                        trade_type: 'popup has position set sl',
                        leverage: (positionData?.leverage || 1).toString(),
                        trade_side: getStatsReportSide(!isBuy, true),
                        margin_mode: marginMode,
                        coin,
                        size: (positionData?.size || 0).toString(),
                        price,
                        trade_usd_value: new BigNumber(price)
                          .times(positionData?.size || 0)
                          .toFixed(2),
                        service_provider: 'hyperliquid',
                        app_version: process.env.release || '0',
                        address_type: currentPerpsAccount?.type || '',
                      });
                    }}
                  />
                </div>
                {slPrice && stopLossExpectedPnl !== null && (
                  <div className="relative bg-r-neutral-card-2 rounded-[6px] mt-[-6px]">
                    <div className="absolute right-[28px] top-[-6px]">
                      <RcIconArrow className="text-r-neutral-card-2" />
                    </div>
                    <div className="flex items-center justify-between p-[12px]">
                      <div className="text-[12px] leading-[14px] text-r-neutral-body">
                        {t(
                          'page.perpsDetail.PerpsAutoCloseModal.stopLossExpectedPNL'
                        )}
                        :
                      </div>
                      <div
                        className={clsx(
                          'text-[12px] leading-[14px] font-bold',
                          stopLossExpectedPnl >= 0
                            ? 'text-r-green-default'
                            : 'text-r-red-default'
                        )}
                      >
                        {stopLossExpectedPnl >= 0 ? '+' : '-'}
                        {formatUsdValue(Math.abs(stopLossExpectedPnl))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="text-15 font-medium text-r-neutral-title-1 mt-16 mb-8">
              {t('page.perps.details')}
            </div>
            <div className="bg-r-neutral-card1 rounded-[12px] px-16">
              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.entryPrice')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  ${splitNumberByStep(positionData?.entryPrice || 0)}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <div className="text-13 text-r-neutral-body flex items-center gap-4 relative">
                  {t('page.perps.size')}
                  <TooltipWithMagnetArrow
                    overlayClassName="rectangle w-[max-content]"
                    placement="top"
                    title={t('page.perps.sizeTips')}
                  >
                    <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                  </TooltipWithMagnetArrow>
                </div>
                <span className="text-r-neutral-title-1 font-medium">
                  $
                  {splitNumberByStep(
                    Number(positionData?.positionValue || 0).toFixed(2)
                  )}{' '}
                  = {positionData?.size} {formatPerpsCoin(coin)}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.direction')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  {positionData?.direction} {positionData?.leverage}x
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.marginMode')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  {positionData?.type === 'cross'
                    ? t('page.perps.cross')
                    : t('page.perps.isolated')}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <div className="text-r-neutral-body flex items-center gap-4 relative">
                  {Number(positionData?.fundingPayments || 0) < 0
                    ? t('page.perps.fundingGains')
                    : t('page.perps.fundingPayments')}
                  <TooltipWithMagnetArrow
                    overlayClassName="rectangle w-[max-content]"
                    placement="top"
                    title={
                      <Trans
                        i18nKey={'page.perpsPro.userInfo.tab.fundingTipsBold'}
                        components={{
                          bold: <span className="font-bold" />,
                        }}
                      />
                    }
                  >
                    <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                  </TooltipWithMagnetArrow>
                </div>
                <span
                  className={clsx(
                    'font-medium',
                    Number(positionData?.fundingPayments || 0) < 0
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {handleDisplayFundingPayments(
                    positionData?.fundingPayments || '0'
                  )}
                </span>
              </div>
            </div>
          </>
        )}

        {!hasPosition && (
          <div className="mt-16">
            <PerpsAbout coin={coin} />
          </div>
        )}

        {/* Market Info Section */}
        <div className="text-15 font-medium text-r-neutral-title-1 mt-16 mb-8">
          Info
        </div>
        <div className="bg-r-neutral-line rounded-[12px] px-16">
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

        {hasPosition && (
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
        providerFee={providerFee}
        maxNtlValue={Number(
          currentAssetCtx?.maxUsdValueSize || PERPS_MAX_NTL_VALUE
        )}
        coin={coin}
        pxDecimals={currentAssetCtx?.pxDecimals || 2}
        szDecimals={currentAssetCtx?.szDecimals || 0}
        leverageRange={[1, currentAssetCtx?.maxLeverage || 5]}
        markPrice={markPrice}
        marginMode={marginMode}
        onMarginModeChange={handleMarginModeChange}
        hasPosition={hasPosition}
        availableBalance={Number(availableBalance || 0)}
        quoteAsset={quoteAsset}
        onDepositPress={() => {
          setOpenPositionVisible(false);
          setAmountVisible(true);
        }}
        onSwapPress={() => {
          setOpenPositionVisible(false);
          handleSwapEntry();
        }}
        onCancel={() => setOpenPositionVisible(false)}
        handleOpenPosition={handleOpenPosition}
        onConfirm={() => {
          setOpenPositionVisible(false);
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
        marginUsed={positionData?.marginUsed || 0}
        markPrice={markPrice}
        entryPrice={positionData?.entryPrice || 0}
        onConfirm={() => {
          setClosePositionVisible(false);
        }}
        handleClosePosition={async (closePercent: number) => {
          let sizeStr = '0';
          if (closePercent < 100) {
            const size = (Number(positionData?.size || 0) * closePercent) / 100;
            sizeStr = size.toFixed(currentAssetCtx?.szDecimals || 0);
          } else {
            sizeStr = positionData?.size.toString() || '0';
          }
          const res = await handleClosePosition({
            coin,
            size: sizeStr,
            direction: positionData?.direction as 'Long' | 'Short',
            price: activeAssetCtx?.markPx || '0',
          });
          if (res) {
            const isBuy = positionData?.direction === 'Long';
            stats.report('perpsTradeHistory', {
              created_at: new Date().getTime(),
              user_addr: currentPerpsAccount?.address || '',
              trade_type: 'popup close position',
              leverage: (positionData?.leverage || 1).toString(),
              trade_side: getStatsReportSide(!isBuy, true),
              margin_mode:
                currentPosition?.position.leverage.type === 'cross'
                  ? 'cross'
                  : 'isolated',
              coin,
              size: res.totalSz,
              price: res.avgPx,
              trade_usd_value: new BigNumber(res.avgPx)
                .times(res.totalSz)
                .toFixed(2),
              service_provider: 'hyperliquid',
              app_version: process.env.release || '0',
              address_type: currentPerpsAccount?.type || '',
            });
          }
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
        positionAndOpenOrders={positionAndOpenOrders}
        favoritedCoins={favoritedCoins}
        onToggleFavorite={toggleFavoriteForSearch}
      />

      <EnableUnifiedAccountPopup
        visible={enableUnifiedVisible}
        onCancel={() => setEnableUnifiedVisible(false)}
        onConfirm={async () => {
          const ok = await handleEnableUnifiedAccount();
          if (ok) {
            setEnableUnifiedVisible(false);
            setSwapVisible(true);
            return false;
          }
          return ok;
        }}
      />
      <SpotSwapPopup
        visible={swapVisible}
        targetAsset={swapTargetAsset}
        onDeposit={() => {
          setSwapVisible(false);
          setSwapTargetAsset(undefined);
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
              await handleUpdateMargin(coin, action, margin);
              setEditMarginVisible(false);
            }}
          />

          <RiskLevelPopup
            direction={positionData.direction as 'Long' | 'Short'}
            pxDecimals={currentAssetCtx?.pxDecimals || 2}
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
            liquidationPx={Number(currentPosition?.position.liquidationPx || 0)}
            positionSize={positionData.size}
            marginUsed={positionData.marginUsed}
            pnlPercent={positionData.pnlPercent}
            pnl={positionData.pnl}
            handlePressRiskTag={() => setRiskPopupVisible(true)}
            quoteAsset={quoteAsset}
            onDepositPress={() => {
              setAddPositionVisible(false);
              setAmountVisible(true);
            }}
            onSwapPress={() => {
              setAddPositionVisible(false);
              handleSwapEntry();
            }}
            onCancel={() => setAddPositionVisible(false)}
            onConfirm={async (tradeSize) => {
              const res = await handleOpenPosition({
                coin,
                size: tradeSize,
                leverage: positionData?.leverage || 1,
                direction: positionData?.direction as 'Long' | 'Short',
                midPx: activeAssetCtx?.markPx || '0',
                isAddPosition: true,
              });
              if (res) {
                const isBuy = positionData?.direction === 'Long';
                stats.report('perpsTradeHistory', {
                  created_at: new Date().getTime(),
                  user_addr: currentPerpsAccount?.address || '',
                  trade_type: 'popup add position',
                  leverage: (positionData?.leverage || 1).toString(),
                  trade_side: getStatsReportSide(isBuy, false),
                  margin_mode:
                    currentPosition?.position.leverage.type === 'cross'
                      ? 'cross'
                      : 'isolated',
                  coin,
                  size: res.totalSz,
                  price: res.avgPx,
                  trade_usd_value: new BigNumber(res.avgPx)
                    .times(res.totalSz)
                    .toFixed(2),
                  service_provider: 'hyperliquid',
                  app_version: process.env.release || '0',
                  address_type: currentPerpsAccount?.type || '',
                });
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
