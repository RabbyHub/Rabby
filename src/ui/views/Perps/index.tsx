import React, { useMemo, useState } from 'react';
import { PageHeader } from '@/ui/component';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/ui/utils';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { findChainByEnum } from '@/utils/chain';
import { ReactComponent as RcIconPerps } from 'ui/assets/dashboard/IconPerps.svg';
import { ReactComponent as RcIconArrowRight } from '@/ui/assets/dashboard/settings/icon-right-arrow-cc.svg';
import { HyperliquidSDK } from '@rabby-wallet/hyperliquid-sdk';
import { Button } from 'antd';
import { PerpsLoginPopup } from './components/LoginPopup';
import { CHAINS_ENUM } from '@debank/common';
import { INTERNAL_REQUEST_ORIGIN } from '@/constant';
import { Account } from '@/background/service/preference';

const DEFAULT_PERPS = ['BTC', 'ETH', 'SOL'];

const formatUSD = (v?: number) => `$${(v || 0).toFixed(2)}`;

export const Perps: React.FC = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const wallet = useWallet();
  const current = useCurrentAccount();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number>(100);
  const [available, setAvailable] = useState<number>(50);
  const chain = useMemo(() => findChainByEnum(CHAINS_ENUM.ETH), []);

  const [loginVisible, setLoginVisible] = useState(false);
  const goBack = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push('/dashboard');
  };

  const handleDeposit = async () => {
    if (!current?.address || !chain) return;
    try {
      setLoading(true);

      // await wallet.sendRequest(
      //   {
      //     method: 'eth_sendTransaction',
      //     params: [
      //       {
      //         from: current.address,
      //         to,
      //         data: data || '0x',
      //         value: value || '0x0',
      //         chainId: chain.id,
      //       },
      //     ],
      //   },
      //   { isBuild: true }
      // );
      setBalance((v) => v + 10);
      setAvailable((v) => v + 10);
    } catch (e) {
      console.error(e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!current?.address || !chain) return;
    try {
      setLoading(true);
      setBalance((v) => (v - 10 < 0 ? 0 : v - 10));
      setAvailable((v) => (v - 10 < 0 ? 0 : v - 10));
    } catch (e) {
      console.error(e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  const onLoginIn = async (account: Account) => {
    const { agentAddress, vault } = await wallet.createPerpsAgentWallet(
      account.address
    );

    const sdk = new HyperliquidSDK({
      masterAddress: account.address,
      agentPrivateKey: vault,
      agentPublicKey: agentAddress,
      agentName: 'rabby-agent',
    });
    (window as any).__HyperliquidSDK = sdk;

    const action = sdk.exchange?.prepareApproveAgent();
    console.log('prepareApproveAgent action', action);
    // const signature = await wallet.sendRequest({
    //   method: 'eth_signTypedDataV4',
    //   params: [account.address, JSON.stringify(action)],
    // });
    const signature = await wallet.signTypedData(
      account.type,
      account.address,
      JSON.stringify(action),
      { version: 'V4' }
    );
    console.log('signMessage signature', signature);

    const result = await sdk.exchange?.sendApproveAgent({
      action: action?.message as any,
      nonce: action?.nonce || 0,
      signature: signature as string,
    });
    console.log('sendApproveAgent result', result);

    wallet.setPerpsCurrentAddress(account.address);
    setLoginVisible(false);
  };

  return (
    <div className="h-full min-h-full bg-r-neutral-bg2 flex flex-col">
      <PageHeader
        className="mx-[20px] pt-[20px] mb-[20px]"
        forceShowBack
        onBack={goBack}
      >
        <span className="text-20 font-medium text-r-neutral-title-1">
          Perps
        </span>
      </PageHeader>

      <div className="flex-1 overflow-auto mx-20">
        <div className="bg-r-neutral-card1 rounded-[12px] p-20">
          <RcIconPerps className="w-40 h-40" />
          <div className="text-13 text-r-neutral-title-1 mt-6">
            {t('page.perps.tradePerps')}
          </div>
          <div className="text-20 font-medium text-r-neutral-foot">
            {t('page.perps.logInTips')}
          </div>
          <Button
            block
            size="large"
            type="primary"
            className="h-[48px] text-r-neutral-title2 text-15 font-medium"
            style={{
              height: 48,
            }}
            onClick={() => {
              setLoginVisible(true);
            }}
          >
            {t('page.perps.logInPerpsAccount')}
          </Button>
          <Button
            block
            size="large"
            type="ghost"
            className="h-[48px] text-r-neutral-title2 text-15 font-medium"
            style={{
              height: 48,
            }}
          >
            {t('page.perps.learnAboutPerps')}
          </Button>
        </div>

        <div className="mt-20">
          <div className="flex justify-between">
            <div className="text-20 font-medium text-r-neutral-title-1">
              {t('page.perps.explorePerps')}
            </div>
            <div className="text-13 text-r-neutral-foot">
              {t('page.perps.seeMore')}
              <RcIconArrowRight
                className="w-14 h-14 ml-4"
                viewBox="0 0 14 14"
              />
            </div>
          </div>
          <div className="bg-r-neutral-card1 rounded-[12px] p-20 gap-12 flex flex-col">
            {DEFAULT_PERPS.map((perp) => (
              <div className="text-20 font-medium text-r-neutral-title-1">
                {`${perp} - USD`}
              </div>
            ))}
          </div>
        </div>
      </div>

      <PerpsLoginPopup
        visible={loginVisible}
        onLogin={async (account) => {
          await onLoginIn(account);
        }}
        onCancel={() => {
          setLoginVisible(false);
        }}
      />
    </div>
  );
};

export default Perps;
