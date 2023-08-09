import { message, Tooltip } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import { CHAINS_ENUM } from 'consts';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconDisconnect from 'ui/assets/icon-disconnect.svg';
import IconDapps from 'ui/assets/dapps.svg';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
import { getCurrentTab, useWallet } from 'ui/utils';
import './style.less';
import { useLocation } from 'react-router-dom';
import { getOriginFromUrl } from '@/utils';
import IconMetamaskBadge from 'ui/assets/dashboard/icon-metamask-badge.svg';
import { useRequest } from 'ahooks';
import { matomoRequestEvent } from '@/utils/matomo-request';

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

  const { data: hasOtherProvider } = useRequest(() =>
    wallet.getHasOtherProvider()
  );

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

  useEffect(() => {
    getCurrentSite();
  }, []);

  const Content = site && (
    <div className="site mr-[18px]">
      {site?.preferMetamask && hasOtherProvider ? (
        <Tooltip
          placement="topLeft"
          overlayClassName="rectangle prefer-metamask-tooltip"
          align={{
            offset: [-12, -4],
          }}
          title={t('page.dashboard.recentConnection.metamaskTooltip')}
        >
          <div className="relative">
            <img
              src={IconMetamaskBadge}
              alt=""
              className="prefer-metamask-badge"
            />
            <FallbackSiteLogo
              url={site.icon}
              origin={site.origin}
              width="28px"
              className="site-icon"
            ></FallbackSiteLogo>
          </div>
        </Tooltip>
      ) : (
        <FallbackSiteLogo
          url={site.icon}
          origin={site.origin}
          width="28px"
          className="site-icon"
        ></FallbackSiteLogo>
      )}
      <div className="site-content">
        <div className="site-name" title={site?.origin}>
          {site?.origin}
        </div>
        <div className={clsx('site-status', site?.isConnected && 'active')}>
          {site?.isConnected
            ? t('page.dashboard.recentConnection.connected')
            : t('page.dashboard.recentConnection.notConnected')}
          <img
            src={IconDisconnect}
            className="site-status-icon"
            alt=""
            onClick={() => handleRemove(site!.origin)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className={clsx('current-connection-block h-[52px]')}>
      {site ? (
        site.isConnected || (site.preferMetamask && hasOtherProvider) ? (
          Content
        ) : (
          <Tooltip
            placement="topLeft"
            overlayClassName="rectangle current-connection-block-tooltip"
            align={{
              offset: [-12, -15],
            }}
            title={t('page.dashboard.recentConnection.connectedDapp')}
          >
            {Content}
          </Tooltip>
        )
      ) : (
        <div className="site is-empty">
          <img src={IconDapps} className="site-icon ml-6" alt="" />
          <div className="site-content">
            {t('page.dashboard.recentConnection.noDappFound')}
          </div>
        </div>
      )}
      <ChainSelector
        className={clsx(!site && 'disabled', {
          'mr-[20px]': hasOtherProvider,
        })}
        value={site?.chain || CHAINS_ENUM.ETH}
        onChange={handleChangeDefaultChain}
        showModal={visible}
        onAfterOpen={() => {
          matomoRequestEvent({
            category: 'Front Page Click',
            action: 'Click',
            label: 'Change Chain',
          });
        }}
        showRPCStatus
      />
    </div>
  );
});
