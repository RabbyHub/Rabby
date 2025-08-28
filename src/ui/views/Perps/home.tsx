import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, splitNumberByStep, useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { findChainByEnum } from '@/utils/chain';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { ReactComponent as RcIconPerps } from 'ui/assets/perps/imgPerps.svg';
import { ReactComponent as RcIconLogout } from '@/ui/assets/perps/IconLogout.svg';
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
import { HistoryPage } from './components/HistoryPage';
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
  useStartDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { PositionItem } from './components/PositionItem';
import BigNumber from 'bignumber.js';
import { AssetItem } from './components/AssetMetaItem';
import NewUserProcessPopup from './components/NewUserProcessPopup';
import { useRabbyDispatch } from '@/ui/store';
import { TopPermissionTips } from './components/TopPermissionTips';
import { PerpsModal } from './components/Modal';

export const Perps: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const wallet = useWallet();
  const dispatch = useRabbyDispatch();
  const [deleteAgentModalVisible, setDeleteAgentModalVisible] = useState(false);
  const [isShowMiniSign, setIsShowMiniSign] = useState(false);
  const {
    positionAndOpenOrders,
    accountSummary,
    currentPerpsAccount,
    isLogin,
    marketData,
    userFills,
    marketDataMap,
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

  const {
    miniSignTx,
    clearMiniSignTx,
    updateMiniSignTx,
    handleDeposit,
    handleSignDepositDirect,
  } = usePerpsDeposit({
    currentPerpsAccount,
  });

  const [popupType, setPopupType] = useState<'deposit' | 'withdraw'>('deposit');
  const startDirectSigning = useStartDirectSigning();
  const [loginVisible, setLoginVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
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
      dispatch.perps.fetchMarketData(undefined);
      dispatch.perps.refreshData();
      setTimeout(() => {
        dispatch.perps.fetchPerpFee();
      }, 1000);
    }
  }, []);

  const [amountVisible, setAmountVisible] = useState(false);

  const goBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push('/dashboard');
  };

  const miniTxs = useMemo(() => {
    return miniSignTx ? [miniSignTx] : [];
  }, [miniSignTx]);

  const canUseDirectSubmitTx = useMemo(
    () => supportedDirectSign(currentPerpsAccount?.type || ''),
    [currentPerpsAccount?.type]
  );
  const withdrawDisabled = !accountSummary?.withdrawable;

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
              className="cursor-pointer mb-12 p-4"
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

      <div className="flex-1 overflow-auto mx-20">
        {isLogin ? (
          <div className="bg-r-neutral-card1 rounded-[12px] p-20 flex flex-col items-center">
            <RcIconPerps className="w-40 h-40" />
            <div className="text-[32px] font-bold text-r-neutral-title-1 mt-16">
              {formatUsdValue(Number(accountSummary?.accountValue || 0))}
            </div>
            <div className="text-15 text-r-neutral-body mt-8">
              {t('page.perps.availableBalance', {
                balance: formatUsdValue(
                  Number(accountSummary?.withdrawable || 0)
                ),
              })}
            </div>
            <div className="w-full flex gap-12 items-center justify-center relative mt-32">
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
                    wallet.changeAccount(currentPerpsAccount);
                  }
                  setPopupType('deposit');
                  setAmountVisible(true);
                }}
              >
                {t('page.gasAccount.deposit')}
              </Button>
            </div>
          </div>
        ) : (
          <PerpsLoginContent
            onLearnAboutPerps={() => {
              setNewUserProcessVisible(true);
            }}
            clickLoginBtn={() => {
              setLoginVisible(true);
            }}
          />
        )}

        {Boolean(positionAndOpenOrders?.length) && (
          <div className="mt-20">
            <div className="flex items-center mb-8">
              <div className="text-13 font-medium text-r-neutral-title-1">
                {t('page.perps.positions')}
              </div>
              <div />
            </div>
            <div className="flex flex-col gap-8">
              {positionAndOpenOrders.map((asset) => (
                <PositionItem
                  key={asset.position.coin}
                  position={asset.position}
                  marketData={marketDataMap[asset.position.coin.toUpperCase()]}
                  onClick={() => {
                    history.push(`/perps/single-coin/${asset.position.coin}`);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-20">
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
        {isLogin ? (
          <HistoryPage
            marketData={marketDataMap}
            historyData={homeHistoryList}
          />
        ) : (
          <div className="h-[20px]" />
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
        currentPerpsAccount={currentPerpsAccount}
        availableBalance={accountSummary?.withdrawable || '0'}
        onChange={(amount) => {
          if (popupType === 'deposit') {
            updateMiniSignTx(amount);
          }
        }}
        onCancel={() => {
          setAmountVisible(false);
          clearMiniSignTx();
        }}
        onConfirm={async (amount) => {
          if (popupType === 'deposit') {
            if (canUseDirectSubmitTx) {
              if (currentPerpsAccount) {
                await wallet.changeAccount(currentPerpsAccount);
              }
              startDirectSigning();
            } else {
              handleDeposit();
            }
            return true;
          } else {
            await handleWithdraw(amount);
            return true;
          }
        }}
      />

      <MiniTypedDataApproval
        txs={miniSignTypeData}
        noShowModalLoading={true}
        onResolve={(txs) => {
          handleMiniSignResolve(txs);
        }}
        onReject={() => {
          handleMiniSignReject();
        }}
        onClose={() => {
          handleMiniSignReject(new Error('User closed'));
        }}
        onPreExecError={() => {
          handleMiniSignReject(new Error('Pre execution error'));
        }}
        directSubmit
        canUseDirectSubmitTx
      />

      <MiniApproval
        txs={miniTxs}
        visible={isShowMiniSign}
        noShowModalLoading={true}
        ga={{
          category: 'Perps',
          source: 'Perps',
          trigger: 'Perps',
        }}
        onClose={() => {
          clearMiniSignTx();
          setIsShowMiniSign(false);
        }}
        onReject={() => {
          clearMiniSignTx();
          setIsShowMiniSign(false);
        }}
        onResolve={(hash) => {
          handleSignDepositDirect(hash);
          setAmountVisible(false);
          setTimeout(() => {
            setIsShowMiniSign(false);
            clearMiniSignTx();
          }, 500);
        }}
        onPreExecError={() => {
          setAmountVisible(false);
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
