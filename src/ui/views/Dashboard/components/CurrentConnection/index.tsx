import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { getOriginFromUrl } from '@/utils';
import { ga4 } from '@/utils/ga4';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { message } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import { CHAINS_ENUM, KEYRING_TYPE } from 'consts';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import IconDapps from 'ui/assets/dapps.svg';
import { ReactComponent as RCIconDisconnectCC } from 'ui/assets/dashboard/current-connection/cc-disconnect.svg';
import IconMetamaskMode from 'ui/assets/metamask-mode-circle.svg';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
import { getCurrentTab, useWallet } from 'ui/utils';
import './style.less';
import { findChain } from '@/utils/chain';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { useMemoizedFn } from 'ahooks';
import { AccountSelector } from '@/ui/component/AccountSelector';
import { Account } from '@/background/service/preference';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import GnosisWrongChainAlertBar from '../GnosisWrongChainAlertBar';
import { useGnosisNetworks } from '@/ui/hooks/useGnosisNetworks';

interface CurrentConnectionProps {
  onChainChange?: (chain: CHAINS_ENUM) => void;
}
export const CurrentConnection = memo((props: CurrentConnectionProps) => {
  const { onChainChange } = props;
  const wallet = useWallet();
  const { t } = useTranslation();
  const [site, setSite] = useState<ConnectedSite | null>(null);
  const { state } = useLocation<{
    trigger?: string;
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false, trigger } = state ?? {};

  const isEnabledDappAccount = useRabbySelector((s) => {
    return s.preference.isEnabledDappAccount;
  });

  const [visible, setVisible] = useState(
    trigger === 'current-connection' && showChainsModal
  );

  const getCurrentSite = useCallback(async () => {
    const tab = await getCurrentTab();
    if (!tab.id || !tab.url) return;
    const domain = getOriginFromUrl(tab.url);
    const current = await wallet.getCurrentSite(tab.id, domain);
    setSite(current);
  }, []);

  const handleRemove = async (origin: string) => {
    await wallet.removeConnectedSite(origin);
    getCurrentSite();
    message.success({
      icon: <i />,
      content: (
        <span className="text-white">
          {t('page.dashboard.recentConnection.disconnected')}
        </span>
      ),
    });
  };

  const handleChangeDefaultChain = async (chain: CHAINS_ENUM) => {
    const _site = {
      ...site!,
      chain,
    };
    setSite(_site);
    setVisible(false);
    onChainChange?.(chain);
    await wallet.setSite(_site);
    const rpc = await wallet.getCustomRpcByChain(chain);
    if (rpc) {
      const avaliable = await wallet.pingCustomRPC(chain);
      if (!avaliable) {
        message.error(t('page.dashboard.recentConnection.rpcUnavailable'));
      }
    }
  };

  const currentAccount = useCurrentAccount();

  const currentSiteAccount = useMemo(() => {
    if (!isEnabledDappAccount) {
      return currentAccount;
    }
    return site?.account ? site.account : currentAccount;
  }, [site?.account, currentAccount, isEnabledDappAccount]);

  const handleSiteAccountChange = useMemoizedFn(async (account) => {
    if (!site) {
      return;
    }
    if (!isEnabledDappAccount) {
      await dispatch.account.changeAccountAsync(account);
    } else {
      const _site = {
        ...site!,
        account,
      };
      setSite(_site);
      setVisible(false);
      await wallet.setSiteAccount({ origin: _site.origin, account });
    }
  });

  useEffect(() => {
    getCurrentSite();
  }, []);

  const chain = useMemo(() => {
    if (!site || !site.isConnected) {
      return null;
    }
    return findChain({
      enum: site.chain || CHAINS_ENUM.ETH,
    });
  }, [site]);

  const handleClickChain = useMemoizedFn(() => {
    if (!site?.isConnected) {
      return;
    }
    setVisible(true);
    matomoRequestEvent({
      category: 'Front Page Click',
      action: 'Click',
      label: 'Change Chain',
    });

    ga4.fireEvent('Click_ChangeChain', {
      event_category: 'Front Page Click',
    });
  });

  const dispatch = useRabbyDispatch();

  const { data: gnosisNetworks, loading } = useGnosisNetworks({
    address:
      currentSiteAccount?.address &&
      currentSiteAccount?.type === KEYRING_TYPE.GnosisKeyring
        ? currentSiteAccount.address
        : '',
  });

  const isShowGnosisAlert = useMemo(() => {
    return (
      currentSiteAccount?.type === KEYRING_TYPE.GnosisKeyring &&
      site?.isConnected &&
      (!gnosisNetworks?.length ||
        (!gnosisNetworks?.find((id) => {
          return (
            +id ===
            findChain({
              enum: site.chain || CHAINS_ENUM.ETH,
            })?.id
          );
        }) &&
          !loading))
    );
  }, [
    currentSiteAccount,
    site?.isConnected,
    site?.chain,
    gnosisNetworks,
    loading,
  ]);

  if (!isEnabledDappAccount) {
    return (
      <>
        <div className={clsx('current-connection-block h-[52px] px-[12px]')}>
          {site ? (
            <>
              <div className="site mr-[18px]">
                <div className="relative">
                  <FallbackSiteLogo
                    url={site.icon}
                    origin={site.origin}
                    width="28px"
                    className="site-icon"
                  ></FallbackSiteLogo>
                  {site.isMetamaskMode ? (
                    <TooltipWithMagnetArrow
                      placement="top"
                      overlayClassName={clsx(
                        'rectangle max-w-[360px] w-[360px]'
                      )}
                      align={{
                        offset: [0, 4],
                      }}
                      title={t(
                        'page.dashboard.recentConnection.metamaskModeTooltipNew'
                      )}
                    >
                      <div className="absolute top-[-4px] right-[-4px] text-r-neutral-title-2">
                        <img src={IconMetamaskMode} alt="metamask mode"></img>
                      </div>
                    </TooltipWithMagnetArrow>
                  ) : null}
                </div>
                <div className="site-content">
                  <div className="site-name" title={site?.origin}>
                    {site?.origin?.replace(/^https?:\/\//, '')}
                  </div>
                  <div
                    className={clsx(
                      'site-status text-[12px]',
                      site?.isConnected && 'active'
                    )}
                  >
                    {site?.isConnected
                      ? t('page.dashboard.recentConnection.connected')
                      : t('page.dashboard.recentConnection.notConnected')}
                    <RCIconDisconnectCC
                      viewBox="0 0 14 14"
                      className="site-status-icon w-12 h-12 ml-4 text-r-neutral-foot hover:text-rabby-red-default"
                      onClick={() => handleRemove(site!.origin)}
                    />
                  </div>
                </div>
              </div>
              <ChainSelector
                className={clsx(!site && 'disabled')}
                value={site?.chain || CHAINS_ENUM.ETH}
                onChange={handleChangeDefaultChain}
                showModal={visible}
                onAfterOpen={() => {
                  matomoRequestEvent({
                    category: 'Front Page Click',
                    action: 'Click',
                    label: 'Change Chain',
                  });

                  ga4.fireEvent('Click_ChangeChain', {
                    event_category: 'Front Page Click',
                  });
                }}
                showRPCStatus
              />
            </>
          ) : (
            <div className="site is-empty">
              <img src={IconDapps} className="site-icon ml-6" alt="" />
              <div className="site-content">
                {t('page.dashboard.recentConnection.noDappFound')}
              </div>
            </div>
          )}
        </div>
        {isShowGnosisAlert ? <GnosisWrongChainAlertBar /> : null}
      </>
    );
  }

  return (
    <>
      <div
        className={clsx(
          'current-connection-block h-[52px]',
          site?.isConnected ? 'site-group' : ''
        )}
      >
        {site ? (
          <div className={clsx('site mr-[18px]')}>
            <div
              className={clsx(
                'site-icon-container',
                site?.isConnected ? 'is-support' : ''
              )}
              onClick={handleClickChain}
            >
              <div className="relative">
                <FallbackSiteLogo
                  url={site.icon}
                  origin={site.origin}
                  width="28px"
                  className="site-icon"
                ></FallbackSiteLogo>
                {site.isMetamaskMode ? (
                  <TooltipWithMagnetArrow
                    placement="top"
                    overlayClassName={clsx('rectangle max-w-[360px] w-[360px]')}
                    align={{
                      offset: [0, 4],
                    }}
                    title={t(
                      'page.dashboard.recentConnection.metamaskModeTooltipNew'
                    )}
                  >
                    <div className="absolute top-[-4px] right-[-4px] text-r-neutral-title-2">
                      <img src={IconMetamaskMode} alt="metamask mode"></img>
                    </div>
                  </TooltipWithMagnetArrow>
                ) : null}
                {chain ? (
                  <div className="absolute bottom-[-3px] right-[-3px]">
                    <img
                      src={chain.logo}
                      alt="chain logo"
                      className="rounded-full w-[16px] h-[16px] border-[#fff] border-[0.5px] border-solid"
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="site-content">
              <div className="site-name" title={site?.origin}>
                {site?.origin?.replace(/^https?:\/\//, '')}
              </div>
              <div
                className={clsx(
                  'site-status text-[12px]',
                  site?.isConnected && 'active'
                )}
              >
                {site?.isConnected
                  ? t('page.dashboard.recentConnection.connected')
                  : t('page.dashboard.recentConnection.notConnected')}
                <RCIconDisconnectCC
                  viewBox="0 0 14 14"
                  className="site-status-icon w-12 h-12 ml-4 text-r-neutral-foot hover:text-rabby-red-default"
                  onClick={() => handleRemove(site!.origin)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="site is-empty">
            <img src={IconDapps} className="site-icon ml-6" alt="" />
            <div className="site-content">
              {t('page.dashboard.recentConnection.noDappFound')}
            </div>
          </div>
        )}
        {site ? (
          <AccountSelector
            className="ml-auto"
            disabled={!site?.isConnected}
            value={currentSiteAccount}
            onChange={handleSiteAccountChange}
          />
        ) : null}
        <ChainSelectorModal
          account={currentSiteAccount}
          value={site?.chain || CHAINS_ENUM.ETH}
          onChange={handleChangeDefaultChain}
          showRPCStatus={true}
          visible={visible}
          onCancel={() => {
            setVisible(false);
          }}
        />
      </div>
      {isShowGnosisAlert ? <GnosisWrongChainAlertBar /> : null}
    </>
  );
});
