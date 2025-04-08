import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { getOriginFromUrl } from '@/utils';
import { ga4 } from '@/utils/ga4';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { message } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import { CHAINS_ENUM } from 'consts';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import IconDapps from 'ui/assets/dapps.svg';
import { ReactComponent as RCIconDisconnectCC } from 'ui/assets/dashboard/current-connection/cc-disconnect.svg';
import IconMetamaskMode from 'ui/assets/metamask-mode-circle.svg';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
import { getCurrentTab, useWallet } from 'ui/utils';
import './style.less';

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
  const [isShowMetamaskModePopup, setIsShowMetamaskModePopup] = useState(false);

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

  return (
    <div className={clsx('current-connection-block h-[52px]')}>
      {site ? (
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
          </div>
          <div className="site-content">
            <div className="site-name" title={site?.origin}>
              {site?.origin}
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
    </div>
  );
});
