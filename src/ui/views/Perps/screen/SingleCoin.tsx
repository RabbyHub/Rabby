import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep, useWallet } from '@/ui/utils';
import { Button, Switch, message } from 'antd';
import clsx from 'clsx';
import { PerpsChart } from '../components/Chart';
import { PERPS_MAX_NTL_VALUE, PERPS_BUILDER_INFO } from '../constants';
import * as Sentry from '@sentry/browser';
import { getPerpsSDK } from '../sdkManager';
import { useMemoizedFn } from 'ahooks';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { ReactComponent as RcIconEdit } from 'ui/assets/perps/IconEditCC.svg';
import { ReactComponent as RcIconTitleSelect } from 'ui/assets/perps/IconTitleSelect.svg';
import { ReactComponent as RcIconTitleSelectDark } from 'ui/assets/perps/IconTitleSelectDark.svg';
import { EditMarginPopup } from '../popup/EditMarginPopup';
import { RiskLevelPopup } from '../popup/RiskLevelPopup';
import {
  CancelOrderParams,
  WsActiveAssetCtx,
} from '@rabby-wallet/hyperliquid-sdk';
import { formatUsdValueKMB } from '../../Dashboard/components/TokenDetailPopup/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { PerpsOpenPositionPopup } from '../popup/OpenPositionPopup';
import { ClosePositionPopup } from '../popup/ClosePositionPopup';
import BigNumber from 'bignumber.js';
import { usePerpsPosition } from '../hooks/usePerpsPosition';
import HistoryContent from '../components/HistoryContent';
import { usePerpsDeposit } from '../hooks/usePerpsDeposit';
import { PerpsDepositAmountPopup } from '../popup/DepositAmountPopup';
import {
  DirectSubmitProvider,
  supportedDirectSign,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { TokenImg } from '../components/TokenImg';
import { TopPermissionTips } from '../components/TopPermissionTips';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { SearchPerpsPopup } from '../popup/SearchPerpsPopup';
import DistanceToLiquidationTag from '../components/DistanceToLiquidationTag';
import { EditTpSlTag } from '../components/EditTpSlTag';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { ReactComponent as RcIconArrow } from '@/ui/assets/perps/polygon-cc.svg';
import { AddPositionPopup } from '../popup/AddPositionPopup';
import usePerpsState from '../hooks/usePerpsState';
import { MiniTypedDataApproval } from '../../Approval/components/MiniSignTypedData/MiniTypeDataApproval';

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
    positionAndOpenOrders,
    accountSummary,
    marketDataMap,
    perpFee,
    marketData,
  } = useRabbySelector((state) => state.perps);
  const [coin, setCoin] = useState(_coin);

  const [amountVisible, setAmountVisible] = useState(false);
  const wallet = useWallet();
  const [isPreparingSign, setIsPreparingSign] = useState(false);

  const [activeAssetCtx, setActiveAssetCtx] = React.useState<
    WsActiveAssetCtx['ctx'] | null
  >(null);
  const [searchPopupVisible, setSearchPopupVisible] = useState(false);
  const [positionDirection, setPositionDirection] = React.useState<
    'Long' | 'Short'
  >('Long');
  const [closePositionVisible, setClosePositionVisible] = React.useState(false);
  const [editMarginVisible, setEditMarginVisible] = useState(false);
  const [addPositionVisible, setAddPositionVisible] = useState(false);
  const [riskPopupVisible, setRiskPopupVisible] = useState(false);
  const activeAssetCtxRef = useRef<(() => void) | null>(null);

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
    return marketDataMap[coin.toUpperCase()];
  }, [marketDataMap, coin]);

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
        order.reduceOnly
    );

    const slItem = currentPosition.openOrders.find(
      (order) =>
        order.orderType === 'Stop Market' && order.isTrigger && order.reduceOnly
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

  const hasPosition = useMemo(() => {
    return !!currentPosition;
  }, [currentPosition]);

  const needDepositFirst = useMemo(() => {
    return (
      Number(accountSummary?.accountValue || 0) === 0 &&
      Number(accountSummary?.withdrawable || 0) === 0
    );
  }, [accountSummary]);

  const accountNeedApprove = useMemo(() => {
    return accountNeedApproveAgent || accountNeedApproveBuilderFee;
  }, [accountNeedApproveAgent, accountNeedApproveBuilderFee]);

  const showOpenPosition = useMemo(() => {
    return history.location.search.includes('openPosition=true');
  }, []);

  const canOpenPosition =
    isLogin &&
    hasPermission &&
    !hasPosition &&
    !needDepositFirst &&
    !accountNeedApprove &&
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

  const currentAccount = useCurrentAccount();
  const signerAccount = currentPerpsAccount || currentAccount;

  const { openDirect, close: closeSign, resetGasStore } = useMiniSigner({
    account: signerAccount!,
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

  useEffect(() => {
    if (
      !isPreparingSign ||
      !canUseDirectSubmitTx ||
      !miniTxs.length ||
      !signerAccount
    ) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        if (cancelled) return;
        closeSign();
        resetGasStore();
        const hashes = await openDirect({
          txs: miniTxs,
          ga: {
            category: 'Perps',
            source: 'Perps',
            trigger: 'Perps',
          },
        });
        if (cancelled) return;
        const hash = hashes[hashes.length - 1];
        if (hash) {
          handleSignDepositDirect(hash);
        }
        setAmountVisible(false);
        setTimeout(() => {
          if (cancelled) return;
          setIsPreparingSign(false);
          clearMiniSignTx();
        }, 500);
      } catch (error) {
        if (cancelled) return;
        if (
          error === MINI_SIGN_ERROR.PREFETCH_FAILURE ||
          error === MINI_SIGN_ERROR.GAS_FEE_TOO_HIGH
        ) {
          handleDeposit();
        } else if (error !== 'User cancelled') {
          console.error('perps single coin direct sign error', error);
          message.error({
            // className: 'toast-message-2025-center',
            duration: 2,
            content:
              typeof (error as any)?.message === 'string'
                ? (error as any).message
                : 'Transaction failed',
          });
        }
        setIsPreparingSign(false);
        clearMiniSignTx();
        setAmountVisible(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    isPreparingSign,
    canUseDirectSubmitTx,
    miniTxs,
    signerAccount,
    openDirect,
    handleSignDepositDirect,
    clearMiniSignTx,
    setAmountVisible,
    handleDeposit,
  ]);

  const subscribeActiveAssetCtx = () => {
    const sdk = getPerpsSDK();
    const { unsubscribe } = sdk.ws.subscribeToActiveAssetCtx(coin, (data) => {
      setActiveAssetCtx(data.ctx);
    });

    return () => {
      unsubscribe();
    };
  };

  // Subscribe to real-time candle updates
  useEffect(() => {
    if (activeAssetCtxRef.current) {
      activeAssetCtxRef.current();
    }
    activeAssetCtxRef.current = subscribeActiveAssetCtx();

    return () => {
      // Cleanup WebSocket subscription
      activeAssetCtxRef.current?.();
      activeAssetCtxRef.current = null;
    };
  }, [coin]);

  // Available balance for trading
  const availableBalance = Number(accountSummary?.withdrawable || 0);

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
            duration: 2,
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
            duration: 2,
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

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader className="mx-[20px] pt-[20px]" forceShowBack>
        <div className="flex items-center justify-center">
          <div
            className="flex items-center gap-8 cursor-pointer"
            style={{ width: 'fit-content' }}
            onClick={() => {
              setSearchPopupVisible(true);
            }}
          >
            <TokenImg logoUrl={currentAssetCtx?.logoUrl} size={24} />
            <span className="text-20 font-medium text-r-neutral-title-1">
              {coin}-USD
            </span>
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
        {!hasPosition && isLogin && (
          <div className="flex justify-between items-center text-15 text-r-neutral-title-1 font-medium pt-12 bg-r-neutral-card1 rounded-[12px] p-16">
            <span>
              {t('page.perps.availableToTrade')}:{' '}
              {formatUsdValue(availableBalance, BigNumber.ROUND_DOWN)}
            </span>
            <div
              className="text-r-blue-default text-13 cursor-pointer px-16 py-10 rounded-[8px] bg-r-blue-light-1"
              onClick={() => {
                setAmountVisible(true);
              }}
            >
              {t('page.perps.deposit')}
            </div>
          </div>
        )}

        {hasPosition && isLogin && (
          <>
            <div className="flex items-center gap-6 mt-16 mb-8">
              <div className="text-13 font-medium text-r-neutral-title-1">
                {t('page.perps.position')}
              </div>
            </div>
            <div className="bg-r-neutral-card1 rounded-[12px] px-16">
              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {t('page.perps.pnl')}
                </span>
                <span
                  className={clsx(
                    'font-medium',
                    positionData && positionData.pnl >= 0
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  )}
                >
                  {positionData && positionData.pnl >= 0 ? '+' : '-'}$
                  {Math.abs(positionData?.pnl || 0).toFixed(2)}
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
                  = {positionData?.size} {coin}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16 group">
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

              <div className="flex justify-between text-13 py-16">
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

              <div className="flex justify-between text-13 py-16">
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
                  coin={coin}
                  markPrice={markPrice}
                  entryPrice={Number(positionData?.entryPrice || 0)}
                  initTpOrSlPrice={currentTpOrSl.slPrice || ''}
                  direction={positionData?.direction as 'Long' | 'Short'}
                  size={Number(positionData?.size || 0)}
                  margin={Number(positionData?.marginUsed || 0)}
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
                  {t('page.perps.entryPrice')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  ${splitNumberByStep(positionData?.entryPrice || 0)}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <div className="text-r-neutral-body flex items-center gap-4 relative">
                  {t('page.perps.liquidationPrice')}
                  <DistanceToLiquidationTag
                    liquidationPrice={Number(
                      currentPosition?.position.liquidationPx || 0
                    )}
                    markPrice={markPrice}
                    onPress={() => {
                      setRiskPopupVisible(true);
                    }}
                  />
                </div>
                <span className="text-r-neutral-title-1 font-medium">
                  ${splitNumberByStep(positionData?.liquidationPrice || 0)}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <div className="text-r-neutral-body flex items-center gap-4 relative">
                  {Number(positionData?.fundingPayments || 0) > 0
                    ? t('page.perps.fundingPayments')
                    : t('page.perps.fundingGains')}
                  <TooltipWithMagnetArrow
                    overlayClassName="rectangle w-[max-content]"
                    placement="top"
                    title={
                      Number(positionData?.fundingPayments || 0) > 0
                        ? t('page.perps.singleCoin.fundingPaymentsTips')
                        : t('page.perps.singleCoin.fundingGainsTips')
                    }
                  >
                    <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                  </TooltipWithMagnetArrow>
                </div>
                <span className="text-r-neutral-title-1 font-medium">
                  {Number(positionData?.fundingPayments || 0) > 0 ? '-' : '+'}$
                  {Math.abs(Number(positionData?.fundingPayments || 0))}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Market Info Section */}
        <div className="text-15 font-medium text-r-neutral-title-1 mt-16 mb-8">
          Info
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

        <div
          className="text-r-neutral-foot mb-20"
          style={{ fontSize: '11px', lineHeight: '16px' }}
        >
          {t('page.perps.openPositionTips')}
        </div>

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
        availableBalance={Number(accountSummary?.withdrawable || 0)}
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
          await handleClosePosition({
            coin,
            size: sizeStr,
            direction: positionData?.direction as 'Long' | 'Short',
            price: activeAssetCtx?.markPx || '0',
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
        type={'deposit'}
        accountValue={accountSummary?.accountValue || '0'}
        availableBalance={accountSummary?.withdrawable || '0'}
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
      />

      {hasPosition && positionData && (
        <>
          <EditMarginPopup
            visible={editMarginVisible}
            coin={coin}
            currentAssetCtx={currentAssetCtx}
            activeAssetCtx={activeAssetCtx}
            direction={positionData.direction as 'Long' | 'Short'}
            entryPrice={positionData.entryPrice}
            leverage={positionData.leverage}
            availableBalance={Number(accountSummary?.withdrawable || 0)}
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
            currentAssetCtx={currentAssetCtx}
            activeAssetCtx={activeAssetCtx}
            direction={positionData.direction as 'Long' | 'Short'}
            leverage={positionData.leverage}
            availableBalance={Number(accountSummary?.withdrawable || 0)}
            liquidationPx={Number(currentPosition?.position.liquidationPx || 0)}
            positionSize={positionData.size}
            marginUsed={positionData.marginUsed}
            pnlPercent={positionData.pnlPercent}
            pnl={positionData.pnl}
            handlePressRiskTag={() => setRiskPopupVisible(true)}
            onCancel={() => setAddPositionVisible(false)}
            onConfirm={async (tradeSize) => {
              await handleOpenPosition({
                coin,
                size: tradeSize,
                leverage: positionData?.leverage || 1,
                direction: positionData?.direction as 'Long' | 'Short',
                midPx: activeAssetCtx?.markPx || '0',
              });
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
