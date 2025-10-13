import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep, useWallet } from '@/ui/utils';
import { Button, Switch, message } from 'antd';
import clsx from 'clsx';
import { PerpsChart } from './Chart';
import { PERPS_MAX_NTL_VALUE } from '../constants';
import * as Sentry from '@sentry/browser';
import { getPerpsSDK } from '../sdkManager';
import { useMemoizedFn } from 'ahooks';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import {
  CancelOrderParams,
  WsActiveAssetCtx,
} from '@rabby-wallet/hyperliquid-sdk';
import { formatUsdValueKMB } from '../../Dashboard/components/TokenDetailPopup/utils';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { PerpsOpenPositionPopup } from './OpenPositionPopup';
import { ClosePositionPopup } from './ClosePositionPopup';
import { AutoClosePositionPopup } from './AutoClosePositionPopup';
import BigNumber from 'bignumber.js';
import { usePerpsPosition } from '../usePerpsPosition';
import HistoryContent from './HistoryContent';
import { usePerpsDeposit } from '../usePerpsDeposit';
import { PerpsDepositAmountPopup } from './DepositAmountPopup';
import {
  DirectSubmitProvider,
  supportedDirectSign,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { TokenImg } from './TokenImg';
import { TopPermissionTips } from './TopPermissionTips';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { MINI_SIGN_ERROR } from '@/ui/component/MiniSignV2/state/SignatureManager';

export const formatPercent = (value: number, decimals = 8) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const PerpsSingleCoin = () => {
  const { coin } = useParams<{ coin: string }>();
  const history = useHistory();
  const { t } = useTranslation();
  const dispatch = useRabbyDispatch();
  const {
    positionAndOpenOrders,
    accountSummary,
    marketDataMap,
    perpFee,
  } = useRabbySelector((state) => state.perps);

  const [amountVisible, setAmountVisible] = useState(false);
  const wallet = useWallet();
  const [isPreparingSign, setIsPreparingSign] = useState(false);

  const [activeAssetCtx, setActiveAssetCtx] = React.useState<
    WsActiveAssetCtx['ctx'] | null
  >(null);

  const [openPositionVisible, setOpenPositionVisible] = React.useState(false);
  const [positionDirection, setPositionDirection] = React.useState<
    'Long' | 'Short'
  >('Long');
  const [closePositionVisible, setClosePositionVisible] = React.useState(false);
  const [autoCloseVisible, setAutoCloseVisible] = useState(false);

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
  const [currentTpOrSl, setCurrentTpOrSl] = useState<{
    tpPrice?: string;
    slPrice?: string;
  }>({
    tpPrice: tpPrice,
    slPrice: slPrice,
  });
  const {
    handleOpenPosition,
    handleClosePosition,
    handleSetAutoClose,
    currentPerpsAccount,
    isLogin,
    userFills,
    hasPermission,
  } = usePerpsPosition({
    setCurrentTpOrSl,
  });

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
    resetGasStore: true,
  });

  const singleCoinHistoryList = useMemo(() => {
    return userFills
      .filter((fill) => fill.coin.toLowerCase() === coin?.toLowerCase())
      .sort((a, b) => b.time - a.time);
  }, [userFills, coin]);

  const hasPosition = useMemo(() => {
    return !!currentPosition;
  }, [currentPosition]);

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
          message.error(
            typeof (error as any)?.message === 'string'
              ? (error as any).message
              : 'Transaction failed'
          );
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

  const subscribeActiveAssetCtx = useMemoizedFn(() => {
    const sdk = getPerpsSDK();
    const { unsubscribe } = sdk.ws.subscribeToActiveAssetCtx(coin, (data) => {
      setActiveAssetCtx(data.ctx);
    });

    return () => {
      unsubscribe();
    };
  });

  // Subscribe to real-time candle updates
  useEffect(() => {
    const unsubscribe = subscribeActiveAssetCtx();

    return () => {
      // Cleanup WebSocket subscription
      unsubscribe?.();
    };
  }, [subscribeActiveAssetCtx]);

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

  const hasAutoClose = useMemo(() => {
    return Boolean(currentTpOrSl.tpPrice || currentTpOrSl.slPrice);
  }, [currentTpOrSl]);

  const handleAutoCloseSwitch = useMemoizedFn(async (e: boolean) => {
    if (e) {
      setAutoCloseVisible(true);
    } else {
      try {
        // 取消所有止盈止损订单
        const sdk = getPerpsSDK();
        if (!tpOid && !slOid) {
          console.error('no find auto close order id');
          return;
        }

        const cancelOrders: CancelOrderParams[] = [];
        if (tpOid) {
          cancelOrders.push({
            oid: tpOid,
            coin,
          });
        }
        if (slOid) {
          cancelOrders.push({
            oid: slOid,
            coin,
          });
        }
        const res = await sdk.exchange?.cancelOrder(cancelOrders);
        if (
          res?.response.data.statuses.every(
            (item) => ((item as unknown) as string) === 'success'
          )
        ) {
          message.success('Auto close position canceled successfully');
          setCurrentTpOrSl({
            tpPrice: undefined,
            slPrice: undefined,
          });
          setTimeout(() => {
            dispatch.perps.fetchPositionOpenOrders();
          }, 1000);
        } else {
          message.error('Auto close position cancel error');
          Sentry.captureException(
            new Error(
              'Auto close position cancel error' +
                'cancelOrders: ' +
                JSON.stringify(cancelOrders) +
                'res: ' +
                JSON.stringify(res)
            )
          );
        }
      } catch (error) {
        message.error('Auto close position cancel error');
        Sentry.captureException(
          new Error(
            'Auto close position cancel error' +
              'error: ' +
              JSON.stringify(error)
          )
        );
      }
    }
  });

  const AutoCloseInfo = useMemo(() => {
    if (hasAutoClose) {
      if (currentTpOrSl.tpPrice && currentTpOrSl.slPrice) {
        const Line = (
          <span className="text-r-neutral-line text-13 mr-4 ml-4">|</span>
        );
        return (
          <div className="text-r-neutral-title-1 font-medium text-13">
            ${currentTpOrSl.tpPrice} {t('page.perps.takeProfit')}
            {Line}${currentTpOrSl.slPrice} {t('page.perps.stopLoss')}
          </div>
        );
      } else if (currentTpOrSl.tpPrice) {
        return (
          <div className="text-r-neutral-title-1 font-medium text-13">
            ${currentTpOrSl.tpPrice} {t('page.perps.takeProfit')}
          </div>
        );
      } else if (currentTpOrSl.slPrice) {
        return (
          <div className="text-r-neutral-title-1 font-medium text-13">
            ${currentTpOrSl.slPrice} {t('page.perps.stopLoss')}
          </div>
        );
      } else {
        return null;
      }
    }
  }, [hasAutoClose, currentTpOrSl]);

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader className="mx-[20px] pt-[20px]" forceShowBack>
        <div className="flex items-center justify-center gap-8">
          <TokenImg logoUrl={currentAssetCtx?.logoUrl} size={24} />
          <span className="text-20 font-medium text-r-neutral-title-1">
            {coin}-USD
          </span>
        </div>
      </PageHeader>

      {!hasPermission ? <TopPermissionTips /> : null}
      <div className="flex-1 overflow-auto mx-20 pb-[40px]">
        {/* Price Chart Section */}
        <PerpsChart
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
            <div className="text-15 font-medium text-r-neutral-title-1 mt-16 mb-8">
              {t('page.perps.yourPosition')}
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
                  {Math.abs(positionData?.pnl || 0).toFixed(2)} (
                  {positionData && positionData.pnl >= 0 ? '+' : ''}
                  {positionData?.pnlPercent.toFixed(2)}%)
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

              <div className="flex justify-between text-13 py-16">
                <span className="text-r-neutral-body">
                  {positionData?.type === 'isolated'
                    ? t('page.perps.marginIsolated')
                    : t('page.perps.marginCross')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  $
                  {splitNumberByStep(
                    Number(positionData?.marginUsed || 0).toFixed(2)
                  )}
                </span>
              </div>

              <div
                className="flex justify-between text-13 py-16 cursor-pointer"
                onClick={() => {
                  handleAutoCloseSwitch(!hasAutoClose);
                }}
              >
                <div className="text-r-neutral-body">
                  <div className="text-13 text-r-neutral-body">
                    {t('page.perps.autoClose')}
                  </div>
                  {AutoCloseInfo}
                </div>
                <Switch
                  className="mt-[2px]"
                  checked={hasAutoClose}
                  // onChange={handleAutoCloseSwitch}
                />
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
                  {t('page.perps.entryPrice')}
                </span>
                <span className="text-r-neutral-title-1 font-medium">
                  ${splitNumberByStep(positionData?.entryPrice || 0)}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <div className="text-r-neutral-body flex items-center gap-4 relative">
                  {t('page.perps.liquidationPrice')}
                  <TooltipWithMagnetArrow
                    overlayClassName="rectangle w-[max-content]"
                    placement="top"
                    title={t('page.perps.liquidationPriceTips')}
                  >
                    <RcIconInfo className="text-rabby-neutral-foot w-14 h-14" />
                  </TooltipWithMagnetArrow>
                </div>
                <span className="text-r-neutral-title-1 font-medium">
                  ${splitNumberByStep(positionData?.liquidationPrice || 0)}
                </span>
              </div>

              <div className="flex justify-between text-13 py-16">
                <div className="text-r-neutral-body flex items-center gap-4 relative">
                  {t('page.perps.fundingPayments')}
                  <TooltipWithMagnetArrow
                    overlayClassName="rectangle w-[max-content]"
                    placement="top"
                    title={t('page.perps.singleCoin.fundingPaymentsTips')}
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
              {t('page.perps.funding')}
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
                <Button
                  block
                  type="primary"
                  size="large"
                  className="h-[48px] bg-blue-500 border-blue-500 text-white text-15 font-medium rounded-[8px]"
                  onClick={() => {
                    setClosePositionVisible(true);
                  }}
                >
                  {positionData?.direction === 'Long'
                    ? t('page.perps.closeLong')
                    : t('page.perps.closeShort')}
                </Button>
              ) : hasPermission ? (
                <div className="flex gap-12 justify-center">
                  <Button
                    size="large"
                    type="primary"
                    className="h-[48px] bg-blue-500 border-blue-500 text-white text-15 font-medium rounded-[8px] flex-1"
                    onClick={() => {
                      setPositionDirection('Long');
                      setOpenPositionVisible(true);
                    }}
                  >
                    {t('page.perps.long')}
                  </Button>
                  <Button
                    size="large"
                    type="primary"
                    className="h-[48px] bg-blue-500 border-blue-500 text-white text-15 font-medium rounded-[8px] flex-1"
                    onClick={() => {
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
        onConfirm={() => {
          setClosePositionVisible(false);
        }}
        handleClosePosition={async () => {
          await handleClosePosition({
            coin,
            size: positionData?.size.toString() || '0',
            direction: positionData?.direction as 'Long' | 'Short',
            price: ((activeAssetCtx?.markPx as unknown) as string) || '0',
          });
        }}
      />

      {/* Auto Close Position Popup */}
      <AutoClosePositionPopup
        visible={autoCloseVisible}
        coin={coin}
        liqPrice={Number(currentPosition?.position.liquidationPx || 0)}
        type="hasPosition"
        price={positionData?.entryPrice || markPrice}
        direction={(positionData?.direction || 'Long') as 'Long' | 'Short'}
        size={Math.abs(positionData?.size || 0)}
        szDecimals={currentAssetCtx?.szDecimals || 0}
        pxDecimals={currentAssetCtx?.pxDecimals || 2}
        onClose={() => setAutoCloseVisible(false)}
        handleSetAutoClose={async (params: {
          tpPrice: string;
          slPrice: string;
        }) => {
          await handleSetAutoClose({
            coin,
            tpTriggerPx: params.tpPrice,
            slTriggerPx: params.slPrice,
            direction: positionData?.direction as 'Long' | 'Short',
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
