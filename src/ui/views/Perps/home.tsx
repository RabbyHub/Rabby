import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep, useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { findChainByEnum, findChainByServerID } from '@/utils/chain';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { ReactComponent as RcIconPerps } from 'ui/assets/perps/imgPerps.svg';
import { ReactComponent as RcIconLogout } from '@/ui/assets/perps/IconLogout.svg';
import { useDebounce } from 'react-use';
import { HyperliquidSDK } from '@rabby-wallet/hyperliquid-sdk';
import { Button } from 'antd';
import { PerpsLoginPopup } from './components/LoginPopup';
import { PerpsLogoutPopup } from './components/LogoutPopup';
import { CHAINS_ENUM } from '@debank/common';
import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { Account } from '@/background/service/preference';
import { usePerpsDeposit } from './usePerpsDeposit';
import { usePerpsState } from './usePerpsState';
import { HeaderAddress } from './components/headerAddress';
import { PerpsLoginContent } from './components/LoginContent';
import { HistoryContent } from './components/HistoryContent';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import clsx from 'clsx';
import { PerpsBlueBorderedButton } from './components/BlueBorderedButton';
import { PerpsDepositAmountPopup } from './components/DepositAmountPopup';
import { TokenSelectPopup } from './components/TokenSelectPopup';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { MiniApproval } from '../Approval/components/MiniSignTx';
import { MiniTypedDataApproval } from '../Approval/components/MiniSignTypedData/MiniTypeDataApproval';
import {
  DirectSubmitProvider,
  supportedDirectSign,
  useMiniApprovalGas,
  useStartDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { PositionItem } from './components/PositionItem';
import BigNumber from 'bignumber.js';
import { AssetItem } from './components/AssetMetaItem';
import NewUserProcessPopup from './components/NewUserProcessPopup';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { TopPermissionTips } from './components/TopPermissionTips';
import { PerpsModal } from './components/Modal';
import { PerpsLoading } from './components/Loading';
import { ARB_USDC_TOKEN_SERVER_CHAIN } from './constants';

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

    miniSignTypeData,
    clearMiniSignTypeData,
    handleMiniSignResolve,
    handleMiniSignReject,

    handleDeleteAgent,
  } = usePerpsState({
    setDeleteAgentModalVisible,
  });

  const [amountVisible, setAmountVisible] = useState(false);
  const {
    miniSignTx,
    clearMiniSignTx,
    updateMiniSignTx,
    handleDeposit,
    handleSignDepositDirect,
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
    return miniSignTx ? [miniSignTx] : [];
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

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader
        className={`mx-[20px] pt-[20px] ${isLogin ? 'mb-0' : ''}`}
        forceShowBack
        onBack={goBack}
        isShowAccount={isLogin ? true : false}
        disableSwitchAccount={true}
        rightSlot={
          isLogin ? (
            <div
              className="flex items-center gap-20 absolute top-[50%] translate-y-[-50%] right-0 cursor-pointer"
              onClick={() => setLogoutVisible(true)}
            >
              <ThemeIcon src={RcIconLogout} />
            </div>
          ) : null
        }
        showCurrentAccount={currentPerpsAccount || undefined}
      >
        Perps
      </PageHeader>
      {!hasPermission ? <TopPermissionTips /> : null}

      <div className="flex-1 overflow-auto">
        {!isInitialized ? (
          <PerpsLoading />
        ) : isLogin ? (
          <div className="mx-20">
            <div className="bg-r-neutral-card1 rounded-[12px] px-16 py-16 flex flex-col items-center">
              <div className="text-[32px] font-bold text-r-neutral-title-1 mt-8">
                {formatUsdValue(Number(accountSummary?.accountValue || 0))}
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
                    Number(accountSummary?.withdrawable || 0)
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
            <div className="flex items-center mb-8">
              <div className="text-13 font-medium text-r-neutral-title-1">
                {t('page.perps.positions')}
              </div>
            </div>
            <div className="flex flex-col gap-8">
              {positionAndOpenOrders
                .sort((a, b) => {
                  return (
                    Number(b.position.marginUsed || 0) -
                    Number(a.position.marginUsed || 0)
                  );
                })
                .map((asset) => (
                  <PositionItem
                    key={asset.position.coin}
                    position={asset.position}
                    marketData={
                      marketDataMap[asset.position.coin.toUpperCase()]
                    }
                    onClick={() => {
                      history.push(`/perps/single-coin/${asset.position.coin}`);
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
                className="text-13 text-r-neutral-foot flex items-center cursor-pointer"
                onClick={() => {
                  history.push('/perps/explore');
                }}
              >
                {t('page.perps.seeMore')}
                <ThemeIcon
                  className="icon icon-arrow-right"
                  src={RcIconArrowRight}
                />
              </div>
            </div>
            <div className="bg-r-neutral-card1 rounded-[12px] flex flex-col">
              {marketData.slice(0, 3).map((item) => (
                <AssetItem key={item.name} item={item} />
              ))}
            </div>
          </div>
        )}
        {isInitialized && isLogin ? (
          <div className="mx-20">
            <HistoryContent
              marketData={marketDataMap}
              historyData={homeHistoryList}
            />
          </div>
        ) : isInitialized ? (
          <div className="h-[20px]" />
        ) : null}
        {isInitialized && (
          <div
            className="text-r-neutral-foot mb-20 mx-20"
            style={{ fontSize: '11px', lineHeight: '16px' }}
          >
            {t('page.perps.openPositionTips')}
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
        visible={amountVisible}
        type={popupType}
        miniTxs={miniTxs}
        setIsPreparingSign={setIsPreparingSign}
        isPreparingSign={isPreparingSign}
        currentPerpsAccount={currentPerpsAccount}
        handleDeposit={handleDeposit}
        handleWithdraw={handleWithdraw}
        updateMiniSignTx={updateMiniSignTx}
        availableBalance={accountSummary?.withdrawable || '0'}
        onClose={() => {
          setAmountVisible(false);
          clearMiniSignTx();
          setIsPreparingSign(false);
        }}
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
          }}
          onClose={() => {
            handleMiniSignReject(new Error('User closed'));
            setLoginVisible(false);
          }}
          onPreExecError={() => {
            handleMiniSignReject(new Error('Pre execution error'));
            setLoginVisible(false);
          }}
          directSubmit
          canUseDirectSubmitTx
        />
      )}

      <MiniApproval
        zIndex={miniSignTypeData.data.length ? 1001 : undefined}
        isPreparingSign={isPreparingSign}
        setIsPreparingSign={setIsPreparingSign}
        txs={miniTxs}
        noShowModalLoading={true}
        ga={{
          category: 'Perps',
          source: 'Perps',
          trigger: 'Perps',
        }}
        onClose={() => {
          clearMiniSignTx();
          setIsPreparingSign(false);
          setAmountVisible(false);
        }}
        onReject={() => {
          clearMiniSignTx();
          setIsPreparingSign(false);
          setAmountVisible(false);
        }}
        onResolve={(hash) => {
          handleSignDepositDirect(hash);
          setAmountVisible(false);
          setTimeout(() => {
            setIsPreparingSign(false);
            clearMiniSignTx();
          }, 500);
        }}
        onPreExecError={() => {
          setAmountVisible(false);
          setIsPreparingSign(false);
          // fallback to normal sign
          handleDeposit();
        }}
        directSubmit
        canUseDirectSubmitTx={canUseDirectSubmitTx}
      />

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

      <PerpsModal
        visible={deleteAgentModalVisible}
        onClose={() => {
          setDeleteAgentModalVisible(false);
        }}
        onConfirm={handleDeleteAgent}
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
