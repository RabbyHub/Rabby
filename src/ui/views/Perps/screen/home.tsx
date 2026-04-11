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
import { RcIconExternal1CC, RcIconExternalCC } from '@/ui/assets/dashboard';
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
import { MiniTypedDataApproval } from '../../Approval/components/MiniSignTypedData/MiniTypeDataApproval';
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
import { sortBy } from 'lodash';
import { RiskLevelPopup } from '../popup/RiskLevelPopup';
import { useThemeMode } from '@/ui/hooks/usePreference';
import stats from '@/stats';
import { getStatsReportSide } from '../../DesktopPerps/utils';
import { PerpsHeaderRight } from '../components/PerpsHeaderRight';
import { OpenProModeEntry } from '../components/OpenProModeEntry';
import { SearchPerpsPopup } from '../popup/SearchPerpsPopup';
import { ExplorePerpsHeader } from '../components/ExplorePerpsHeader';
import { PerpsInvitePopup } from '../popup/PerpsInvitePopup';
import { useScroll } from 'ahooks';
import { usePerpsAccount } from '../hooks/usePerpsAccount';
import { PerpsAccountCard } from '../components/PerpsAccountCard';

export const Perps: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const [deleteAgentModalVisible, setDeleteAgentModalVisible] = useState(false);
  const accounts = useRabbySelector((s) => s.accountToDisplay.accountsList);
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
  const [closePositionVisible, setClosePositionVisible] = useState(false);
  const [closePosition, setClosePosition] = useState<
    AssetPosition['position'] | null
  >(null);
  const [searchPopupVisible, setSearchPopupVisible] = useState(false);
  const [amountVisible, setAmountVisible] = useState(false);
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

  const [popupType, setPopupType] = useState<'deposit' | 'withdraw'>('deposit');
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

  const { accountValue, availableBalance } = usePerpsAccount();

  const favoritedCoins = useRabbySelector((s) => s.perps.favoritedCoins);

  const toggleFavorite = useMemoizedFn((coin: string) => {
    dispatch.perps.toggleFavoriteCoin(coin);
  });

  const marketSectionList = useMemo(() => {
    const sorted = sortBy(marketData, (item) => -(item.dayNtlVlm || 0));
    const favorites = sorted.filter((item) =>
      favoritedCoins.includes(item.name)
    );
    const others = sorted.filter((item) => !favoritedCoins.includes(item.name));
    return [...favorites, ...others];
  }, [marketData, favoritedCoins]);

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

  const handleClosePosition = useMemoizedFn(
    async (params: {
      coin: string;
      size: string;
      direction: 'Long' | 'Short';
      price: string;
    }) => {
      try {
        const sdk = getPerpsSDK();
        const { coin, direction, price, size } = params;
        const res = await sdk.exchange?.marketOrderClose({
          coin,
          isBuy: direction === 'Short',
          size,
          midPx: price,
          builder: PERPS_BUILDER_INFO,
        });

        const filled = res?.response?.data?.statuses[0]?.filled;
        if (filled) {
          // dispatch.perps.fetchClearinghouseState();
          const { totalSz, avgPx } = filled;
          message.success({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: t('page.perps.toast.closePositionSuccess', {
              direction,
              coin,
              size: totalSz,
              price: avgPx,
            }),
          });
          return filled as { totalSz: string; avgPx: string; oid: number };
        } else {
          const msg = res?.response?.data?.statuses[0]?.error;
          message.error({
            // className: 'toast-message-2025-center',
            duration: 1.5,
            content: msg || 'close position error',
          });
          Sentry.captureException(
            new Error(
              'PERPS close position noFills' +
                'params: ' +
                JSON.stringify(params) +
                'res: ' +
                JSON.stringify(res)
            )
          );
          return null;
        }
      } catch (e) {
        const isExpired = await judgeIsUserAgentIsExpired(e?.message || '');
        if (isExpired) {
          return null;
        }
        console.error('close position error', e);
        message.error({
          // className: 'toast-message-2025-center',
          duration: 1.5,
          content: e?.message || 'close position error',
        });
        Sentry.captureException(
          new Error(
            'PERPS close position error' +
              'params: ' +
              JSON.stringify(params) +
              'error: ' +
              JSON.stringify(e)
          )
        );
        return null;
      }
    }
  );

  const handleCloseAllPosition = useMemoizedFn(async () => {
    try {
      await handleActionApproveStatus();
      const sdk = getPerpsSDK();
      for (const item of positionAndOpenOrders) {
        const isBuy = Number(item.position.szi || 0) > 0;
        const closePrice = marketDataMap[item.position.coin]?.markPx || '0';
        const res = await handleClosePosition({
          coin: item.position.coin,
          size: Math.abs(Number(item.position.szi || 0)).toString() || '0',
          direction: isBuy ? 'Long' : 'Short',
          price: closePrice,
        });
        if (res) {
          stats.report('perpsTradeHistory', {
            created_at: new Date().getTime(),
            user_addr: currentPerpsAccount?.address || '',
            trade_type: 'popup close all position',
            leverage: item.position.leverage.value.toString(),
            trade_side: getStatsReportSide(!isBuy, true),
            margin_mode:
              item.position.leverage.type === 'cross' ? 'cross' : 'isolated',
            coin: item.position.coin,
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
        await sleep(10);
      }
      dispatch.perps.fetchClearinghouseState();
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
                  handleCloseAllPosition();
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

  const positionCoinSet = useMemo(() => {
    const set = new Set();
    positionAndOpenOrders?.forEach((order) => {
      set.add(order.position.coin);
    });
    return set;
  }, [positionAndOpenOrders]);

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
                setPopupType('deposit');
                setAmountVisible(true);
              }}
              onWithdraw={() => {
                setPopupType('withdraw');
                setAmountVisible(true);
              }}
              onLearnMore={() => {
                setNewUserProcessVisible(true);
              }}
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
                      history.push(
                        `/perps/single-coin/${asset.position.coin}?openPosition=true`
                      );
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
            <ExplorePerpsHeader
              ref={headerRef}
              onSearchClick={() => {
                setSearchPopupVisible(true);
                setOpenFromSource('searchPerps');
              }}
            />
            <div className="rounded-[8px] flex flex-col gap-8">
              {marketSectionList.map((item) => (
                <AssetItem
                  key={item.name}
                  item={item}
                  onClick={() => {
                    history.push(
                      `/perps/single-coin/${item.name}?openPosition=true`
                    );
                  }}
                  hasPosition={positionCoinSet.has(item.name)}
                  isFavorited={favoritedCoins.includes(item.name)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
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
      <PerpsDepositAmountPopup
        resetBridgeQuoteLoading={resetBridgeQuoteLoading}
        visible={amountVisible}
        type={popupType}
        miniTxs={miniTxs}
        quoteLoading={quoteLoading}
        bridgeQuote={bridgeQuote}
        setIsPreparingSign={setIsPreparingSign}
        isPreparingSign={isPreparingSign}
        currentPerpsAccount={currentPerpsAccount}
        handleDeposit={handleDeposit}
        handleWithdraw={handleWithdraw}
        clearMiniSignTx={clearMiniSignTx}
        updateMiniSignTx={updateMiniSignTx}
        accountValue={accountValue.toString() || '0'}
        availableBalance={availableBalance.toString() || '0'}
        onClose={() => {
          setAmountVisible(false);
          clearMiniSignTx();
          setIsPreparingSign(false);
        }}
        handleSignDepositDirect={handleSignDepositDirect}
      />
      {/* {Boolean(miniSignTypeData.data.length) && (
        <MiniTypedDataApproval
          txs={miniSignTypeData.data}
          account={miniSignTypeData.account || undefined}
          noShowModalLoading={true}
          onResolve={(txs) => {
            handleMiniSignResolve(txs);
          }}
          onReject={() => {
            handleMiniSignReject(new Error('User Rejected'));
            setLoginVisible(false);
            setAmountVisible(false);
          }}
          onClose={() => {
            handleMiniSignReject(new Error('User closed'));
            setLoginVisible(false);
            setAmountVisible(false);
          }}
          onPreExecError={() => {
            handleMiniSignReject(new Error('Pre execution error'));
            setLoginVisible(false);
            setAmountVisible(false);
          }}
          directSubmit
          canUseDirectSubmitTx
        />
      )} */}
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
        onCancel={() => {
          setSearchPopupVisible(false);
          setOpenFromSource('openPosition');
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
