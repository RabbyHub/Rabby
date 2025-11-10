import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader, TokenWithChain } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { ReactComponent as IconSearchCC } from '@/ui/assets/perps/IconSearchCC.svg';
import { useTranslation } from 'react-i18next';
import {
  formatUsdValue,
  sleep,
  splitNumberByStep,
  useWallet,
} from '@/ui/utils';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { AssetPosition, HyperliquidSDK } from '@rabby-wallet/hyperliquid-sdk';
import { Button, message, Modal } from 'antd';
import { PerpsLoginPopup } from '../popup/LoginPopup';
import { PerpsLogoutPopup } from '../popup/LogoutPopup';
import { usePerpsDeposit } from '../hooks/usePerpsDeposit';
import { usePerpsState } from '../hooks/usePerpsState';
import { PerpsLoginContent } from '../components/LoginContent';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import clsx from 'clsx';
import { PerpsBlueBorderedButton } from '../components/BlueBorderedButton';
import { PerpsDepositAmountPopup } from '../popup/DepositAmountPopup';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
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
import { PerpsHeaderRight } from '../components/PerpsHeaderRight';
import { SearchPerpsPopup } from '../popup/SearchPerpsPopup';

export const Perps: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const [deleteAgentModalVisible, setDeleteAgentModalVisible] = useState(false);
  const accounts = useRabbySelector((s) => s.accountToDisplay.accountsList);
  const {
    positionAndOpenOrders,
    accountSummary,
    currentPerpsAccount,
    isLogin,
    marketData,
    userFills,
    marketDataMap,
    isInitialized,
    logout,
    login,
    handleWithdraw,
    homeHistoryList,
    hasPermission,
    localLoadingHistory,
    miniSignTypeData,
    clearMiniSignTypeData,
    handleMiniSignResolve,
    handleMiniSignReject,

    handleDeleteAgent,
    perpFee,

    judgeIsUserAgentIsExpired,
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
  useEffect(() => {
    wallet.getHasDoneNewUserProcess().then((hasDoneNewUserProcess) => {
      if (!hasDoneNewUserProcess) {
        setNewUserProcessVisible(true);
      }
    });
  }, [wallet]);

  useEffect(() => {
    if (isLogin) {
      // dispatch.perps.fetchClearinghouseState();
      dispatch.perps.fetchPositionAndOpenOrders();
      // dispatch.perps.fetchUserHistoricalOrders();
    }
  }, []);
  const canUseDirectSubmitTx = useMemo(
    () => supportedDirectSign(currentPerpsAccount?.type || ''),
    [currentPerpsAccount?.type]
  );
  const miniTxs = useMemo(() => {
    console.log('miniSignTx', miniSignTx);
    return miniSignTx || [];
  }, [miniSignTx]);

  const positionAllPnl = useMemo(() => {
    return positionAndOpenOrders.reduce((acc, asset) => {
      return acc + Number(asset.position.unrealizedPnl || 0);
    }, 0);
  }, [positionAndOpenOrders]);

  const goBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push('/dashboard');
  };

  const withdrawDisabled = useMemo(
    () => !Number(accountSummary?.withdrawable || 0),
    [accountSummary?.withdrawable]
  );

  const marketSectionList = useMemo(() => {
    return sortBy(marketData, (item) => -(item.dayNtlVlm || 0));
  }, [marketData]);

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
          message.success(
            t('page.perps.toast.closePositionSuccess', {
              direction,
              coin,
              size: totalSz,
              price: avgPx,
            })
          );
        } else {
          const msg = res?.response?.data?.statuses[0]?.error;
          message.error(msg || 'close position error');
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
        message.error(e?.message || 'close position error');
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
      const sdk = getPerpsSDK();
      for (const item of positionAndOpenOrders) {
        await handleClosePosition({
          coin: item.position.coin,
          size: Math.abs(Number(item.position.szi || 0)).toString() || '0',
          direction: Number(item.position.szi || 0) > 0 ? 'Long' : 'Short',
          price: marketDataMap[item.position.coin.toUpperCase()]?.markPx || '0',
        });
        await sleep(10);
      }
      dispatch.perps.fetchClearinghouseState();
    } catch (error) {
      console.error('close all position error', error);
      message.error(error?.message || 'close all position error');
      Sentry.captureException(
        new Error(
          'PERPS close all position error' + 'error: ' + JSON.stringify(error)
        )
      );
    }
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
        className={`mx-[20px] pt-[20px] ${isLogin ? 'mb-0' : ''}`}
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
        {t('page.perps.title')}
      </PageHeader>
      {!hasPermission ? <TopPermissionTips /> : null}

      <div className="flex-1 overflow-auto">
        {!isInitialized ? (
          <PerpsLoading />
        ) : isLogin ? (
          <div className="mx-20">
            <div className="bg-r-neutral-card1 rounded-[12px] px-16 py-16 flex flex-col items-center">
              <div className="text-[32px] font-bold text-r-neutral-title-1 mt-8">
                {formatUsdValue(
                  Number(accountSummary?.accountValue || 0),
                  BigNumber.ROUND_DOWN
                )}
              </div>
              {Boolean(positionAndOpenOrders?.length) && (
                <div
                  className={`text-15 font-medium ${
                    positionAllPnl >= 0
                      ? 'text-r-green-default'
                      : 'text-r-red-default'
                  }`}
                >
                  {positionAllPnl >= 0 ? '+' : '-'}$
                  {splitNumberByStep(Math.abs(positionAllPnl).toFixed(2))}
                </div>
              )}
              <div className="text-13 text-r-neutral-foot mt-10">
                {t('page.perps.availableBalance', {
                  balance: formatUsdValue(
                    Number(accountSummary?.withdrawable || 0),
                    BigNumber.ROUND_DOWN
                  ),
                })}
              </div>
              <div className="w-full flex gap-12 items-center justify-center relative mt-24">
                <TooltipWithMagnetArrow
                  className="rectangle w-[max-content]"
                  visible={withdrawDisabled ? undefined : false}
                  title={t('page.gasAccount.noBalance')}
                >
                  <PerpsBlueBorderedButton
                    block
                    className={clsx(
                      withdrawDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => {
                      if (currentPerpsAccount) {
                        dispatch.account.changeAccountAsync(
                          currentPerpsAccount
                        );
                      }
                      setPopupType('withdraw');
                      setAmountVisible(true);
                    }}
                    disabled={withdrawDisabled}
                  >
                    {t('page.gasAccount.withdraw')}
                  </PerpsBlueBorderedButton>
                </TooltipWithMagnetArrow>
                <Button
                  block
                  size="large"
                  type="primary"
                  className="h-[44px] text-r-neutral-title2 text-15 font-medium"
                  style={{
                    height: 44,
                  }}
                  onClick={() => {
                    if (currentPerpsAccount) {
                      dispatch.account.changeAccountAsync(currentPerpsAccount);
                    }
                    setPopupType('deposit');
                    setAmountVisible(true);
                  }}
                >
                  {t('page.gasAccount.deposit')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-20">
            <PerpsLoginContent
              onLearnAboutPerps={() => {
                setNewUserProcessVisible(true);
              }}
              clickLoginBtn={() => {
                setLoginVisible(true);
              }}
            />
          </div>
        )}

        {isInitialized && Boolean(positionAndOpenOrders?.length) && (
          <div className="mt-20 mx-20">
            <div className="flex items-center mb-8 justify-between">
              <div className="text-13 font-medium text-r-neutral-title-1">
                {t('page.perps.positions')}
              </div>
              <div
                className="text-13 font-medium text-r-neutral-foot hover:text-rb-brand-default cursor-pointer"
                onClick={() => {
                  const modal = Modal.info({
                    width: 360,
                    closable: false,
                    maskClosable: true,
                    centered: true,
                    title: null,
                    bodyStyle: {
                      padding: 0,
                    },
                    className: clsx(
                      'perps-bridge-swap-modal perps-close-all-position-modal',
                      isDarkTheme
                        ? 'perps-bridge-swap-modal-dark'
                        : 'perps-bridge-swap-modal-light'
                    ),
                    content: (
                      <>
                        <div className="flex items-center justify-center flex-col gap-12 bg-r-neutral-bg2 rounded-lg">
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
                                await handleCloseAllPosition();
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
                }}
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
                    marketData={
                      marketDataMap[asset.position.coin.toUpperCase()]
                    }
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
            <div className="flex justify-between mb-8">
              <div className="text-13 font-medium text-r-neutral-title-1">
                {t('page.perps.explorePerps')}
              </div>
              <div
                className="cursor-pointer p-[2px]"
                onClick={() => {
                  setSearchPopupVisible(true);
                  setOpenFromSource('searchPerps');
                }}
              >
                <ThemeIcon
                  className="icon text-r-neutral-foot"
                  src={IconSearchCC}
                />
              </div>
            </div>
            <div className="rounded-[8px] flex flex-col gap-8">
              {marketSectionList.map((item) => (
                <AssetItem
                  key={item.name}
                  item={item}
                  onClick={() => {
                    history.push(`/perps/single-coin/${item.name}`);
                  }}
                  hasPosition={positionCoinSet.has(item.name)}
                />
              ))}
            </div>
          </div>
        )}
        {isLogin && hasPermission && (
          <div className="fixed bottom-0 left-0 right-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 py-16 bg-r-neutral-bg2">
            <Button
              block
              type="primary"
              onClick={() => {
                setSearchPopupVisible(true);
                setOpenFromSource('openPosition');
              }}
              size="large"
              className="h-[48px] bg-blue-500 border-blue-500 text-white text-15 font-medium rounded-[8px]"
            >
              {t('page.perps.searchPerpsPopup.openPosition')}
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
        clearMiniSignTypeData={clearMiniSignTypeData}
        updateMiniSignTx={updateMiniSignTx}
        accountValue={accountSummary?.accountValue || '0'}
        availableBalance={accountSummary?.withdrawable || '0'}
        onClose={() => {
          setAmountVisible(false);
          clearMiniSignTx();
          clearMiniSignTypeData();
          setIsPreparingSign(false);
        }}
        handleSignDepositDirect={handleSignDepositDirect}
      />

      {Boolean(miniSignTypeData.data.length) && (
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
      )}

      <NewUserProcessPopup
        visible={newUserProcessVisible}
        onCancel={async () => {
          setNewUserProcessVisible(false);
          const hasDoneNewUserProcess = await wallet.getHasDoneNewUserProcess();
          if (!hasDoneNewUserProcess) {
            history.push('/dashboard');
          }
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
          history.push(`/perps/single-coin/${coin}`);
        }}
        openFromSource={openFromSource}
      />

      <PerpsModal
        visible={deleteAgentModalVisible}
        onClose={() => {
          setDeleteAgentModalVisible(false);
        }}
        onConfirm={handleDeleteAgent}
      />

      {riskPopupCoin && (
        <RiskLevelPopup
          visible={riskPopupVisible}
          pxDecimals={Number(
            marketDataMap[riskPopupCoin.toUpperCase()]?.pxDecimals || 2
          )}
          liquidationPrice={Number(
            positionAndOpenOrders.find((p) => p.position.coin === riskPopupCoin)
              ?.position.liquidationPx || 0
          )}
          markPrice={Number(
            marketDataMap[riskPopupCoin.toUpperCase()]?.markPx || 0
          )}
          onClose={() => {
            setRiskPopupVisible(false);
            setRiskPopupCoin('');
          }}
        />
      )}
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
