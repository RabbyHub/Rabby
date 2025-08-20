import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatUsdValue, useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { findChainByEnum } from '@/utils/chain';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { ReactComponent as RcIconPerps } from 'ui/assets/perps/imgPerps.svg';
import { ReactComponent as RcIconLogout } from '@/ui/assets/perps/IconLogout.svg';
import { HyperliquidSDK } from '@rabby-wallet/hyperliquid-sdk';
import { Button } from 'antd';
import { PerpsLoginPopup } from './components/LoginPopup';
import { CHAINS_ENUM } from '@debank/common';
import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { Account } from '@/background/service/preference';
import { usePerpsDeposit } from './hook';
import { usePerpsState } from './usePerpsState';
import { HeaderAddress } from './components/headerAddress';
import { PerpsLoginContent } from './components/LoginContent';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import clsx from 'clsx';
import { PerpsBlueBorderedButton } from './components/BlueBorderedButton';
import { PerpsDepositAmountPopup } from './components/DepositAmountPopup';
import { TokenSelectPopup } from './components/TokenSelectPopup';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { MiniApproval } from '../Approval/components/MiniSignTx';
import {
  DirectSubmitProvider,
  supportedDirectSign,
  useStartDirectSigning,
} from '@/ui/hooks/useMiniApprovalDirectSign';
import { PositionItem } from './components/PositionItem';

const DEFAULT_PERPS = ['BTC', 'ETH', 'SOL'];

export const Perps: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const wallet = useWallet();
  const [isShowMiniSign, setIsShowMiniSign] = useState(false);
  const currentAccount = useCurrentAccount();
  // 使用全局状态
  const {
    clearinghouseState,
    currentPerpsAccount,
    isLogin,
    logout,
    loginPerpsAccount,
  } = usePerpsState();

  const {
    miniSignTx,
    clearMiniSignTx,
    updateMiniSignTx,
    handleDeposit,
  } = usePerpsDeposit({
    currentPerpsAccount,
  });

  const startDirectSigning = useStartDirectSigning();
  const [loginVisible, setLoginVisible] = useState(false);

  const [amountVisible, setAmountVisible] = useState(false);

  const goBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push('/dashboard');
  };

  const handleWithdraw = async () => {
    console.log('handleWithdraw');
  };

  const miniTxs = useMemo(() => {
    return miniSignTx ? [miniSignTx] : [];
  }, [miniSignTx]);
  console.log('miniTxs', miniTxs);

  const canUseDirectSubmitTx = supportedDirectSign(currentAccount?.type || '');
  const withdrawDisabled = !clearinghouseState?.withdrawable;

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader
        className="mx-[20px] pt-[20px] mb-[20px]"
        forceShowBack
        onBack={goBack}
        isShowAccount={currentPerpsAccount ? true : false}
        disableSwitchAccount={true}
        rightSlot={
          <div className="cursor-pointer p-4" onClick={logout}>
            <ThemeIcon src={RcIconLogout} />
          </div>
        }
        showCurrentAccount={currentPerpsAccount || undefined}
      >
        Perps
      </PageHeader>

      <div className="flex-1 overflow-auto mx-20">
        {isLogin ? (
          <div className="bg-r-neutral-card1 rounded-[12px] p-20 flex flex-col items-center">
            <RcIconPerps className="w-40 h-40" />
            <div className="text-20 font-medium text-r-neutral-title-1 mt-16">
              {formatUsdValue(
                Number(clearinghouseState?.marginSummary.accountValue)
              )}
            </div>
            <div className="text-13 text-r-neutral-body mt-8">
              {t('page.perps.availableBalance', {
                balance: formatUsdValue(
                  Number(clearinghouseState?.withdrawable)
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
                  onClick={handleWithdraw}
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
                  setAmountVisible(true);
                }}
              >
                {t('page.gasAccount.deposit')}
              </Button>
            </div>
          </div>
        ) : (
          <PerpsLoginContent
            clickLoginBtn={() => {
              setLoginVisible(true);
            }}
          />
        )}

        {Boolean(clearinghouseState?.assetPositions?.length) && (
          <div className="mt-20">
            <div className="flex items-center mb-8">
              <div className="text-13 font-medium text-r-neutral-title-1">
                {t('page.perps.positions')}
              </div>
              <div />
            </div>
            <div className="flex flex-col">
              {clearinghouseState?.assetPositions.map((asset) => (
                <PositionItem
                  key={asset.position.coin}
                  position={asset.position}
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
            <div className="text-13 text-r-neutral-foot flex items-center cursor-pointer">
              {t('page.perps.seeMore')}
              <ThemeIcon
                className="icon icon-arrow-right"
                src={RcIconArrowRight}
              />
            </div>
          </div>
          <div className="bg-r-neutral-card1 rounded-[12px] p-20 gap-12 flex flex-col">
            {DEFAULT_PERPS.map((perp) => (
              <div
                className="text-20 font-medium text-r-neutral-title-1 border border-transparent hover:border-rabby-blue-default cursor-pointer"
                onClick={() => {
                  history.push(`/perps/single-coin/${perp}`);
                }}
              >
                {`${perp} - USD`}
              </div>
            ))}
          </div>
        </div>
      </div>

      <PerpsLoginPopup
        visible={loginVisible}
        onLogin={async (account) => {
          await loginPerpsAccount(account);
          setLoginVisible(false);
        }}
        onCancel={() => {
          setLoginVisible(false);
        }}
      />

      <PerpsDepositAmountPopup
        visible={amountVisible}
        onChange={(amount) => {
          updateMiniSignTx(amount);
        }}
        onCancel={() => {
          setAmountVisible(false);
          clearMiniSignTx();
        }}
        onDeposit={() => {
          if (canUseDirectSubmitTx) {
            startDirectSigning();
          } else {
            handleDeposit();
          }
        }}
      />

      <MiniApproval
        txs={miniTxs}
        visible={isShowMiniSign}
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
        onResolve={() => {
          setTimeout(() => {
            setIsShowMiniSign(false);
            clearMiniSignTx();
          }, 500);
        }}
        onPreExecError={() => {
          // fallback to normal sign
          handleDeposit();
        }}
        directSubmit
        canUseDirectSubmitTx={canUseDirectSubmitTx}
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
