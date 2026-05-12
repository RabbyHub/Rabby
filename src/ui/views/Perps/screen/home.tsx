import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { PageHeader, TokenWithChain } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  formatUsdValue,
  sleep,
  splitNumberByStep,
  useWallet,
} from '@/ui/utils';
import { ReactComponent as RcIconBackTopCC } from '@/ui/assets/perps/IconBackTopCC.svg';
import { ReactComponent as RcIconHyperLogo } from '@/ui/assets/perps/IconHyperLogo.svg';
import { AssetPosition, HyperliquidSDK } from '@rabby-wallet/hyperliquid-sdk';
import { Button, message, Modal } from 'antd';
import { PerpsLoginPopup } from '../popup/LoginPopup';
import { PerpsLogoutPopup } from '../popup/LogoutPopup';
import { usePerpsDeposit } from '../hooks/usePerpsDeposit';
import { usePerpsState } from '../hooks/usePerpsState';
import { PerpsLoginContent } from '../components/LoginContent';
import clsx from 'clsx';
import { PerpsBlueBorderedButton } from '../components/BlueBorderedButton';
import { PerpsDepositAmountPopup } from '../popup/DepositAmountPopup';
import { PerpsWithdrawPopup } from '../popup/WithdrawPopup';
import { EnableUnifiedAccountPopup } from '../popup/EnableUnifiedAccountPopup';
import { SpotSwapPopup } from '../popup/SpotSwapPopup';
import { usePerpsActions } from '../hooks/usePerpsActions';
import { usePerpsAccount } from '../hooks/usePerpsAccount';
import type { PerpsQuoteAsset } from '../constants';
import {
  DirectSubmitProvider,
  supportedDirectSign,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { PositionItem } from '../components/PositionItem';
import BigNumber from 'bignumber.js';
import { AssetItem } from '../components/AssetMetaItem';
import NewUserProcessPopup from '../popup/NewUserProcessPopup';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { TopPermissionTips } from '../components/TopPermissionTips';
import { PerpsModal } from '../components/Modal';
import { PerpsLoading } from '../components/Loading';
import {
  ARB_USDC_TOKEN_ID,
  ARB_USDC_TOKEN_SERVER_CHAIN,
  PERPS_BUILDER_INFO,
} from '../constants';
import { useMemoizedFn } from 'ahooks';
import { getPerpsSDK } from '../sdkManager';
import * as Sentry from '@sentry/browser';
import { RiskLevelPopup } from '../popup/RiskLevelPopup';
import { useThemeMode } from '@/ui/hooks/usePreference';
import stats from '@/stats';
import { getStatsReportSide } from '../../DesktopPerps/utils';
import { PerpsHeaderRight } from '../components/PerpsHeaderRight';
import { OpenProModeEntry } from '../components/OpenProModeEntry';
import { SearchPerpsPopup } from '../popup/SearchPerpsPopup';
import { PerpsCategorySectionHeader } from '../components/PerpsCategorySectionHeader';
import { usePerpsGroupedMarketData } from '../hooks/usePerpsGroupedMarketData';
import { PerpsCategoryId } from '../constants/perpsCategories';
import { PerpsInvitePopup } from '../popup/PerpsInvitePopup';
import { useScroll } from 'ahooks';
import { PerpsAccountCard } from '../components/PerpsAccountCard';
import { usePerpsPosition } from '../hooks/usePerpsPosition';

export const Perps: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const [deleteAgentModalVisible, setDeleteAgentModalVisible] = useState(false);
  const accounts = useRabbySelector((s) => s.accountToDisplay.accountsList);
  const clearinghouseState = useRabbySelector(
    (s) => s.perps.clearinghouseState
  );
  const {
    positionAndOpenOrders,
    currentPerpsAccount,
    isLogin,
    marketData,
    marketDataMap,
    isInitialized,
    logout,
    login,
    handleWithdraw,
    hasPermission,
    localLoadingHistory,

    handleDeleteAgent,

    judgeIsUserAgentIsExpired,
    handleActionApproveStatus,
    handleSafeSetReference,
  } = usePerpsState({
    setDeleteAgentModalVisible,
  });
  const { isDarkTheme } = useThemeMode();
  const { handleEnableUnifiedAccount } = usePerpsActions();
  const { isUnifiedAccount } = usePerpsAccount();
  const [closePositionVisible, setClosePositionVisible] = useState(false);
  const [closePosition, setClosePosition] = useState<
    AssetPosition['position'] | null
  >(null);
  const [searchPopupVisible, setSearchPopupVisible] = useState(false);
  const [searchInitialTab, setSearchInitialTab] = useState<
    PerpsCategoryId | undefined
  >(undefined);
  const [amountVisible, setAmountVisible] = useState(false);
  const [enableUnifiedVisible, setEnableUnifiedVisible] = useState(false);
  const [swapVisible, setSwapVisible] = useState(false);
  const [swapTargetAsset, setSwapTargetAsset] = useState<
    PerpsQuoteAsset | undefined
  >();
  const [swapSourceAsset, setSwapSourceAsset] = useState<
    PerpsQuoteAsset | undefined
  >();
  const [pendingSwapAfterEnable, setPendingSwapAfterEnable] = useState(false);

  const openSwapPopup = useMemoizedFn(
    (params: { source?: PerpsQuoteAsset; target?: PerpsQuoteAsset }) => {
      setSwapSourceAsset(params.source);
      setSwapTargetAsset(params.target);
      if (!isUnifiedAccount) {
        setPendingSwapAfterEnable(true);
        setEnableUnifiedVisible(true);
        return;
      }
      setSwapVisible(true);
    }
  );

  const [riskPopupVisible, setRiskPopupVisible] = useState(false);
  const [riskPopupCoin, setRiskPopupCoin] = useState<string>('');
  const [openFromSource, setOpenFromSource] = useState<
    'openPosition' | 'searchPerps'
  >('openPosition');
  const [openPositionDirection, setOpenPositionDirection] = useState<
    'Long' | 'Short'
  >('Long');
  const {
    miniSignTx,
    clearMiniSignTx,
    updateMiniSignTx,
    resetBridgeQuoteLoading,
    handleDeposit,
    handleSignDepositDirect,
    quoteLoading,
    bridgeQuote,
  } = usePerpsDeposit({
    currentPerpsAccount,
    setAmountVisible,
  });

  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [isPreparingSign, setIsPreparingSign] = useState(false);
  const [newUserProcessVisible, setNewUserProcessVisible] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInitialTopRef = useRef<number>(0);
  const scroll = useScroll(scrollContainerRef);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !isInitialized) return;

    // 重置初始位置
    headerInitialTopRef.current = 0;

    const handleScroll = () => {
      if (!headerRef.current) return;

      const stickyRect = headerRef.current.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();

      if (
        headerInitialTopRef.current === 0 &&
        scrollContainer.scrollTop === 0
      ) {
        headerInitialTopRef.current = stickyRect.top - containerRect.top;
      }

      const scrollTop = scrollContainer.scrollTop;
      const isSticky =
        stickyRect.top <= containerRect.top ||
        (headerInitialTopRef.current > 0 &&
          scrollTop >= headerInitialTopRef.current);
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [isInitialized]);

  useEffect(() => {
    dispatch.perps.initFavoritedCoins(undefined);
    dispatch.perps.initCandleInterval(undefined);
    dispatch.perps.initMarginModePreferences(undefined);
  }, []);
  const canUseDirectSubmitTx = useMemo(
    () => supportedDirectSign(currentPerpsAccount?.type || ''),
    [currentPerpsAccount?.type]
  );
  const miniTxs = useMemo(() => {
    console.log('miniSignTx', miniSignTx);
    return miniSignTx || [];
  }, [miniSignTx]);

  const goBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push('/dashboard');
  };

  const favoritedCoins = useRabbySelector((s) => s.perps.favoritedCoins);
  const marketDataCategories = useRabbySelector(
    (s) => s.perps.marketDataCategories
  );

  const toggleFavorite = useMemoizedFn((coin: string) => {
    dispatch.perps.toggleFavoriteCoin(coin);
  });

  const { visibleHome } = usePerpsGroupedMarketData({
    marketData,
    favoriteMarkets: favoritedCoins,
    backendCategories: marketDataCategories,
  });

  // Calculate real-time popup data based on selected coin
  const riskPopupData = useMemo(() => {
    if (!riskPopupCoin) {
      return null;
    }

    const selectedPosition = positionAndOpenOrders?.find(
      (item) => item.position.coin === riskPopupCoin
    );
    if (!selectedPosition) {
      return null;
    }

    const marketDataItem = marketDataMap[riskPopupCoin];
    const markPrice = Number(marketDataItem?.markPx || 0);
    const liquidationPrice = Number(
      selectedPosition.position.liquidationPx || 0
    );

    // const distanceLiquidation = calculateDistanceToLiquidation(
    //   selectedPosition.position.liquidationPx,
    //   marketDataItem?.markPx
    // );
    return {
      // distanceLiquidation,
      direction:
        Number(selectedPosition.position.szi || 0) > 0
          ? 'Long'
          : ('Short' as 'Long' | 'Short'),
      currentPrice: markPrice,
      pxDecimals: marketDataItem?.pxDecimals || 2,
      liquidationPrice,
    };
  }, [riskPopupCoin, positionAndOpenOrders, marketDataMap]);

  const { handleCloseAllPositions } = usePerpsPosition();

  const handleCloseAll = useMemoizedFn(async () => {
    try {
      if (!clearinghouseState || !currentPerpsAccount) {
        return;
      }
      await handleActionApproveStatus();
      const ok = await handleCloseAllPositions(clearinghouseState);
      if (!ok) return;
      clearinghouseState.assetPositions.forEach((item) => {
        const isBuy = Number(item.position.szi || 0) > 0;
        const price = new BigNumber(item.position.positionValue || 0).div(
          new BigNumber(item.position.szi || 1).abs()
        );
        stats.report('perpsTradeHistory', {
          created_at: new Date().getTime(),
          user_addr: currentPerpsAccount?.address || '',
          trade_type: 'close all market',
          leverage: item.position.leverage.value.toString(),
          trade_side: getStatsReportSide(isBuy, true),
          margin_mode:
            item.position.leverage.type === 'cross' ? 'cross' : 'isolated',
          coin: item.position.coin,
          size: Math.abs(Number(item.position.szi || 0)),
          price: price.toFixed(2),
          trade_usd_value: item.position.positionValue,
          service_provider: 'hyperliquid',
          app_version: process.env.release || '0',
          address_type: currentPerpsAccount?.type || '',
        });
      });
    } catch (error) {
      console.error('close all position error', error);
      message.error({
        // className: 'toast-message-2025-center',
        duration: 1.5,
        content: error?.message || 'close all position error',
      });
      Sentry.captureException(
        new Error(
          'PERPS close all position error' + 'error: ' + JSON.stringify(error)
        )
      );
    }
  });

  const handleClickCloseAll = useMemoizedFn(async () => {
    const modal = Modal.info({
      width: 360,
      closable: false,
      maskClosable: true,
      centered: true,
      title: null,
      className: clsx(
        'perps-bridge-swap-modal perps-close-all-position-modal',
        isDarkTheme
          ? 'perps-bridge-swap-modal-dark'
          : 'perps-bridge-swap-modal-light'
      ),
      bodyStyle: {
        padding: 0,
      },
      content: (
        <>
          <div
            className={clsx(
              'flex items-center justify-center flex-col gap-12',
              'bg-r-neutral-bg2 rounded-lg',
              'px-[16px] pt-[20px] pb-[24px]'
            )}
          >
            <div className="text-[17px] font-bold text-r-neutral-title-1 text-center">
              {t('page.perps.closeAllPopup.title')}
            </div>
            <div className="text-15 font-medium text-r-neutral-title-1 text-center">
              {t('page.perps.closeAllPopup.description')}
            </div>
            <div className="flex items-center justify-center w-full gap-12 mt-20">
              <PerpsBlueBorderedButton
                block
                onClick={() => {
                  modal.destroy();
                }}
              >
                {t('page.manageAddress.cancel')}
              </PerpsBlueBorderedButton>
              <Button
                size="large"
                block
                type="primary"
                onClick={async () => {
                  handleCloseAll();
                  modal.destroy();
                }}
              >
                {t('page.manageAddress.confirm')}
              </Button>
            </div>
          </div>
        </>
      ),
    });
  });

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader
        className={`mx-[20px] pt-[20px] relative ${isLogin ? 'mb-0' : ''}`}
        forceShowBack
        onBack={goBack}
        isShowAccount={isLogin ? true : false}
        disableSwitchAccount={false}
        onSwitchAccountClick={() => {
          setLoginVisible(true);
        }}
        rightSlot={
          <PerpsHeaderRight
            isLogin={isLogin}
            localLoadingHistory={localLoadingHistory}
          />
        }
        showCurrentAccount={currentPerpsAccount || undefined}
      >
        <span className="flex items-center justify-center gap-6">
          <RcIconHyperLogo className="w-[20px] h-[20px]" />
          {t('page.perps.title')}
        </span>
      </PageHeader>
      {!hasPermission ? <TopPermissionTips /> : null}
      <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
        {!isInitialized ? (
          <PerpsLoading />
        ) : (
          <div className="mx-20">
            <PerpsAccountCard
              currentPerpsAccount={currentPerpsAccount}
              onDeposit={() => {
                setAmountVisible(true);
              }}
              onWithdraw={() => {
                setWithdrawVisible(true);
              }}
              onLearnMore={() => {
                setNewUserProcessVisible(true);
              }}
              onSwap={(source) => openSwapPopup({ source })}
            />
          </div>
        )}

        <OpenProModeEntry />

        {isInitialized && Boolean(positionAndOpenOrders?.length) && (
          <div className="mt-20 mx-20">
            <div className="flex items-center mb-8 justify-between">
              <div className="text-13 font-medium text-r-neutral-title-1 flex items-center gap-6">
                <span className="w-[2px] h-[12px] bg-r-blue-default inline-block" />
                {t('page.perps.positions')}
              </div>
              <div
                className="text-13 font-medium text-r-neutral-foot hover:text-rb-brand-default cursor-pointer"
                onClick={handleClickCloseAll}
              >
                {t('page.perps.closeAll')}
              </div>
            </div>
            <div className="flex flex-col gap-8">
              {positionAndOpenOrders
                .sort((a, b) => {
                  return (
                    Number(b.position.positionValue || 0) -
                    Number(a.position.positionValue || 0)
                  );
                })
                .map((asset) => (
                  <PositionItem
                    key={asset.position.coin}
                    position={asset.position}
                    openOrders={asset.openOrders}
                    marketData={marketDataMap[asset.position.coin]}
                    handleClosePosition={(position) => {
                      setClosePosition(position);
                      setClosePositionVisible(true);
                    }}
                    handleNavigate={() => {
                      history.push(`/perps/single-coin/${asset.position.coin}`);
                    }}
                    onShowRiskPopup={(coin) => {
                      setRiskPopupCoin(coin);
                      setRiskPopupVisible(true);
                    }}
                  />
                ))}
            </div>
          </div>
        )}

        {isInitialized && (
          <div className="mt-20 mx-20">
            {visibleHome.map((cat) => (
              <div key={cat.id} className="mb-24">
                <PerpsCategorySectionHeader
                  cfg={cat.cfg}
                  onSearchClick={() => {
                    setSearchInitialTab(cat.id);
                    setSearchPopupVisible(true);
                    setOpenFromSource('searchPerps');
                  }}
                />
                <div className="rounded-[8px] flex flex-col gap-8">
                  {cat.items.map((item, i) => (
                    <AssetItem
                      key={`${cat.id}-${item.name}`}
                      item={item}
                      rank={cat.cfg.showRankOnHome ? i + 1 : undefined}
                      onClick={() => {
                        history.push(`/perps/single-coin/${item.name}`);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="h-[96px]"></div>
        {isLogin && (
          <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-r-neutral-bg2 z-20 flex gap-12">
            <Button
              block
              disabled={!hasPermission}
              size="large"
              className="h-[48px] text-white text-15 font-medium rounded-[8px] border-none"
              style={{ backgroundColor: 'var(--r-green-default, #2abb7f)' }}
              onClick={() => {
                setOpenPositionDirection('Long');
                setSearchPopupVisible(true);
                setOpenFromSource('openPosition');
              }}
            >
              {t('page.perps.long')}
            </Button>
            <Button
              block
              disabled={!hasPermission}
              size="large"
              className="h-[48px] text-white text-15 font-medium rounded-[8px] border-none"
              style={{ backgroundColor: 'var(--r-red-default, #e34935)' }}
              onClick={() => {
                setOpenPositionDirection('Short');
                setSearchPopupVisible(true);
                setOpenFromSource('openPosition');
              }}
            >
              {t('page.perps.short')}
            </Button>
          </div>
        )}
      </div>
      <PerpsLoginPopup
        visible={loginVisible}
        onLogin={async (account) => {
          await login(account);
          setLoginVisible(false);
        }}
        onCancel={() => {
          setLoginVisible(false);
        }}
        perpsAccount={currentPerpsAccount}
      />
      <PerpsLogoutPopup
        visible={logoutVisible}
        account={currentPerpsAccount}
        onLogout={() => {
          logout(currentPerpsAccount?.address || '');
          setLogoutVisible(false);
        }}
        onCancel={() => {
          setLogoutVisible(false);
        }}
      />
      <EnableUnifiedAccountPopup
        visible={enableUnifiedVisible}
        onCancel={() => {
          setEnableUnifiedVisible(false);
          setPendingSwapAfterEnable(false);
        }}
        onConfirm={async () => {
          const ok = await handleEnableUnifiedAccount();
          if (ok && pendingSwapAfterEnable) {
            setEnableUnifiedVisible(false);
            setPendingSwapAfterEnable(false);
            setSwapVisible(true);
            return false;
          }
          return ok;
        }}
      />
      <SpotSwapPopup
        visible={swapVisible}
        sourceAsset={swapSourceAsset}
        targetAsset={swapTargetAsset}
        disableSwitch={!!swapTargetAsset}
        onDeposit={() => {
          setSwapVisible(false);
          setAmountVisible(true);
        }}
        onCancel={() => {
          setSwapVisible(false);
          setSwapSourceAsset(undefined);
          setSwapTargetAsset(undefined);
        }}
      />
      <PerpsDepositAmountPopup
        resetBridgeQuoteLoading={resetBridgeQuoteLoading}
        visible={amountVisible}
        miniTxs={miniTxs}
        quoteLoading={quoteLoading}
        bridgeQuote={bridgeQuote}
        setIsPreparingSign={setIsPreparingSign}
        isPreparingSign={isPreparingSign}
        currentPerpsAccount={currentPerpsAccount}
        handleDeposit={handleDeposit}
        clearMiniSignTx={clearMiniSignTx}
        updateMiniSignTx={updateMiniSignTx}
        onClose={() => {
          setAmountVisible(false);
          clearMiniSignTx();
          setIsPreparingSign(false);
        }}
        handleSignDepositDirect={handleSignDepositDirect}
      />
      <PerpsWithdrawPopup
        visible={withdrawVisible}
        currentPerpsAccount={currentPerpsAccount}
        handleWithdraw={handleWithdraw}
        onClose={() => setWithdrawVisible(false)}
      />
      <NewUserProcessPopup
        visible={newUserProcessVisible}
        onCancel={async () => {
          setNewUserProcessVisible(false);
        }}
        onComplete={() => {
          wallet.setHasDoneNewUserProcess(true);
        }}
      />
      <SearchPerpsPopup
        visible={searchPopupVisible}
        initialTab={searchInitialTab}
        onCancel={() => {
          setSearchPopupVisible(false);
          setOpenFromSource('openPosition');
          setSearchInitialTab(undefined);
        }}
        marketData={marketData}
        positionAndOpenOrders={positionAndOpenOrders}
        onSelect={(coin) => {
          const dirParam =
            openFromSource === 'openPosition'
              ? `&direction=${openPositionDirection}`
              : '';
          history.push(
            `/perps/single-coin/${coin}?openPosition=true${dirParam}`
          );
        }}
        openFromSource={openFromSource}
        favoritedCoins={favoritedCoins}
        onToggleFavorite={toggleFavorite}
      />
      <PerpsModal
        visible={deleteAgentModalVisible}
        onClose={() => {
          setDeleteAgentModalVisible(false);
        }}
        onConfirm={handleDeleteAgent}
      />
      {riskPopupCoin && riskPopupData && (
        <RiskLevelPopup
          visible={riskPopupVisible}
          direction={riskPopupData.direction}
          pxDecimals={riskPopupData?.pxDecimals || 2}
          liquidationPrice={riskPopupData.liquidationPrice}
          markPrice={Number(marketDataMap[riskPopupCoin]?.markPx || 0)}
          onClose={() => {
            setRiskPopupVisible(false);
            setRiskPopupCoin('');
          }}
        />
      )}
      <PerpsInvitePopup
        onInvite={async () => {
          // todo check need deposit first
          await handleActionApproveStatus();
          handleSafeSetReference();
        }}
      />
    </div>
  );
};

const PerpsWrapper = () => {
  return (
    <DirectSubmitProvider>
      <Perps />
    </DirectSubmitProvider>
  );
};

export default PerpsWrapper;
