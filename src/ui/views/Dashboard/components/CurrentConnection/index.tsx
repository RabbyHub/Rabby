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
import { findChain } from '@/utils/chain';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { useMemoizedFn } from 'ahooks';
import { AccountSelector } from '@/ui/component/AccountSelector';
import { Account } from '@/background/service/preference';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import GnosisWrongChainAlertBar from '../GnosisWrongChainAlertBar';
import { useGnosisNetworks } from '@/ui/hooks/useGnosisNetworks';
import styled from 'styled-components';

const Container = styled.div`
  margin-top: 12px;
  display: flex;
  align-items: center;
  border-radius: 8px;
  background: var(--r-neutral-card1, #fff);
  padding: 10px 12px;

  &.site-group:hover {
    .site-icon-container.is-support {
      cursor: pointer;
      border: 1px solid var(--r-blue-default, #7084ff);
      background: var(--r-blue-light1, #eef1ff);
    }
    .global-account-selector:not(.is-disabled) {
      border: 1px solid var(--r-blue-default, #7084ff);
      background: var(--r-blue-light1, #eef1ff);
    }
    .site-status-icon {
      color: var(--r-red-default, #e34935) !important;
    }
  }

  .site {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    .prefer-metamask-badge {
      position: absolute;
      top: -10px;
      left: -10px;
      width: 24px;
      height: 24px;
    }
    &.is-empty {
      .site-icon {
        width: 20px;
        border-radius: none;
      }
      .site-content {
        font-weight: 400;
        font-size: 12px;
        line-height: 14px;
        color: var(--r-neutral-foot, #6a7587);
      }
    }
    & .site-status.active .site-status-icon {
      display: block;
    }
    &-icon {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 28px;
    }
    &-icon-container {
      padding: 3px;
      border-radius: 1000px;
      border: 1px solid transparent;

      &.is-support:hover {
        cursor: pointer;
        border: 1px solid var(--r-blue-default, #7084ff);
        background: var(--r-blue-light1, #eef1ff);
      }
    }

    &-content {
      flex: 1;
      overflow: hidden;
    }
    &-name {
      font-weight: 400;
      font-size: 13px;
      line-height: 15px;
      color: var(--r-neutral-title-1, rgba(25, 41, 69, 1));
      margin-bottom: 2px;
    }
    &-status {
      font-weight: 400;
      font-size: 11px;
      line-height: 13px;
      color: var(--r-neutral-foot, #6a7587);
      display: flex;
      align-items: center;
      &.active {
        color: #27c193;
      }
      &-icon {
        display: none;
        margin-left: 8px;
        width: 12px;
        cursor: pointer;
      }
    }
  }

  .chain-selector {
    margin-left: auto;
    background-color: transparent;
    height: 36px;
    border-radius: 8px;
    padding-left: 8px;
    color: var(--r-neutral-title-1, rgba(25, 41, 69, 1));

    .chain-logo {
      width: 20px;
      height: 20px;
      margin-right: 6px;
    }
    .icon-arrow-down {
      margin-left: 6px;
      margin-right: 8px;
    }
    &.disabled {
      opacity: 0.4;
      pointer-events: none;
    }
    &:hover {
      background-color: rgba(134, 151, 255, 0.2);
    }
  }
`;

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
    ga4.fireEvent('Click_DisconnectDapp', {
      event_category: 'Front Page Click',
    });
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
        <Container className={clsx('h-[52px] px-[12px]')}>
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
                  <div className="site-name truncate" title={site?.origin}>
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
        </Container>
        {isShowGnosisAlert ? <GnosisWrongChainAlertBar /> : null}
      </>
    );
  }

  return (
    <>
      <Container
        className={clsx('h-[52px]', site?.isConnected ? 'site-group' : '')}
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
              <div className="site-name truncate" title={site?.origin}>
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
      </Container>
      {isShowGnosisAlert ? <GnosisWrongChainAlertBar /> : null}
    </>
  );
});
