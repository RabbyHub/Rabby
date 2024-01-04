import ChainIcon from '@/ui/component/ChainIcon';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { getOriginFromUrl } from '@/utils';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { useRequest } from 'ahooks';
import { message, Tooltip } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import { CHAINS_ENUM } from 'consts';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import IconDapps from 'ui/assets/dapps.svg';
import { ReactComponent as RcIconDisconnect } from 'ui/assets/dashboard/current-connection/cc-disconnect.svg';
import { ReactComponent as RcIconSearch } from 'ui/assets/dashboard/current-connection/cc-search.svg';
import { ReactComponent as RcIconStarFill } from 'ui/assets/dashboard/current-connection/cc-star-fill.svg';
import { ReactComponent as RcIconStar } from 'ui/assets/dashboard/current-connection/cc-star.svg';
import IconMetamaskBadge from 'ui/assets/dashboard/icon-metamask-badge.svg';
import { FallbackSiteLogo } from 'ui/component';
import { getCurrentTab, openInternalPageInTab, useWallet } from 'ui/utils';
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

  const customRPC = useRabbySelector((s) => s.customRPC.customRPC);

  const handleClickSearch = () => {
    openInternalPageInTab('dapp-search');
  };

  const { data: hasOtherProvider } = useRequest(() =>
    wallet.getHasOtherProvider()
  );

  const [visible, setVisible] = useState(
    trigger === 'current-connection' && showChainsModal
  );

  const getCurrentSite = useCallback(async () => {
    const tab = await getCurrentTab();
    if (!tab.id || !tab.url) return;
    const domain = getOriginFromUrl(tab?.url);
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

  const dispatch = useRabbyDispatch();

  useEffect(() => {
    dispatch.customRPC.getAllRPC();
  }, []);

  const Content = site && (
    <div className="site">
      <div
        className="site-chain-selector"
        onClick={() => {
          setVisible(true);
          matomoRequestEvent({
            category: 'Front Page Click',
            action: 'Click',
            label: 'Change Chain',
          });
        }}
      >
        <div className="relative">
          {site?.preferMetamask && hasOtherProvider ? (
            <Tooltip
              placement="topLeft"
              overlayClassName="rectangle prefer-metamask-tooltip"
              align={{
                offset: [-9, -4],
              }}
              title={t('page.dashboard.recentConnection.metamaskTooltip')}
            >
              <img
                src={IconMetamaskBadge}
                alt=""
                className="prefer-metamask-badge"
              />
            </Tooltip>
          ) : null}
          <FallbackSiteLogo
            url={site.icon}
            origin={site.origin}
            width="32px"
            className="site-icon"
          ></FallbackSiteLogo>
          {site ? (
            <ChainIcon
              chain={site.chain}
              innerClassName="chain-icon-inner"
              showCustomRPCToolTip
              customRPC={
                customRPC[site.chain]?.enable ? customRPC[site.chain].url : ''
              }
              tooltipTriggerElement="dot"
              tooltipProps={{
                placement: 'topLeft',
                overlayClassName:
                  'rectangle current-connection-custom-rpc-tooltip',
                align: {
                  offset: [-40, 0],
                },
              }}
            />
          ) : null}
        </div>
      </div>
      <div className="site-content">
        <div className="site-name" title={site?.origin}>
          <div className="site-name-inner">{site?.origin}</div>
          {site?.isTop ? (
            <div className="icon-star text-r-blue-default">
              <RcIconStarFill />
            </div>
          ) : (
            <div className="icon-star text-r-neutral-foot">
              <RcIconStar />
            </div>
          )}
        </div>
        <div className={clsx('site-status', site?.isConnected && 'active')}>
          {site?.isConnected
            ? t('page.dashboard.recentConnection.connected')
            : t('page.dashboard.recentConnection.notConnected')}
          <Tooltip
            placement="top"
            overlayClassName="rectangle"
            title="Disconnect"
            align={{
              offset: [0, 2],
            }}
          >
            <div
              className="site-status-icon"
              onClick={() => handleRemove(site!.origin)}
            >
              <RcIconDisconnect />
            </div>
          </Tooltip>
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
              offset: [-9, -15],
            }}
            title={t('page.dashboard.recentConnection.connectedDapp')}
          >
            {Content}
          </Tooltip>
        )
      ) : (
        <div className="site is-empty">
          <img src={IconDapps} className="site-icon" alt="" />
          <div className="site-content text-r-neutral-body text-[13px] leading-[16px]">
            {t('page.dashboard.recentConnection.noDappFound')}
          </div>
        </div>
      )}
      <div className="w-[0.5px] bg-r-neutral-line h-[28px]"></div>
      <div
        className={clsx('site-dapps', { 'mr-[20px]': hasOtherProvider })}
        onClick={handleClickSearch}
      >
        <RcIconSearch />
        {t('page.dashboard.recentConnection.dapps')}
      </div>
      <ChainSelectorModal
        value={site?.chain || CHAINS_ENUM.ETH}
        visible={visible}
        onChange={handleChangeDefaultChain}
        onCancel={() => {
          setVisible(false);
        }}
        zIndex={9999}
        showRPCStatus
      />
    </div>
  );
});
