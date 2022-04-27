import { message, Tooltip } from 'antd';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import { CHAINS, CHAINS_ENUM } from 'consts';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconDisconnect from 'ui/assets/icon-disconnect.svg';
import IconSiteDefault from 'ui/assets/site-default.svg';
import { ChainSelector } from 'ui/component';
import { getCurrentTab, useWallet } from 'ui/utils';
import './style.less';

export const CurrentConnection = memo(() => {
  const [visible, setVisible] = useState(false);
  const wallet = useWallet();
  const { t } = useTranslation();
  const [site, setSite] = useState<ConnectedSite>();

  const getCurrentSite = useCallback(async () => {
    const tab = await getCurrentTab();
    const current = await wallet.getCurrentSite(tab.id);
    setSite(current);
  }, []);

  const handleRemove = async (origin: string) => {
    await wallet.removeConnectedSite(origin);
    getCurrentSite();
    message.success({
      icon: <i />,
      content: <span className="text-white">{t('Disconnected')}</span>,
    });
  };

  const handleChangeDefaultChain = async (chain: CHAINS_ENUM) => {
    const _site = {
      ...site!,
      chain,
    };
    if (!site?.isConnected) {
      const chainName = CHAINS[chain].name;
      message.success({
        icon: <i />,
        content: (
          <span className="text-white">
            {t(
              `${chainName} has been selected as the chain to the current site`
            )}
          </span>
        ),
      });
    }
    setSite(_site);
    setVisible(false);
    await wallet.setSite(_site);
  };

  useEffect(() => {
    getCurrentSite();
  }, []);

  const Content = (
    <div className="site">
      <img src={site?.icon} className="site-icon" alt="" />
      <div className="site-content">
        <div className="site-name" title={site?.origin}>
          {site?.origin}
        </div>
        <div className={clsx('site-status', site?.isConnected && 'active')}>
          {site?.isConnected ? 'Connected' : 'Not connected'}
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
    <div className={clsx('current-connection-block')}>
      {site ? (
        site.isConnected ? (
          Content
        ) : (
          <Tooltip
            placement="topLeft"
            overlayClassName="rectangle current-connection-block-tooltip"
            align={{
              offset: [-12, -15],
            }}
            title="Rabby is not connected to the current Dapp.To connect, find and click the connect button on the Dapp’s webpage."
          >
            {Content}
          </Tooltip>
        )
      ) : (
        <div className="site is-empty">
          <img
            src={IconSiteDefault}
            className="site-icon rounded-none"
            alt=""
          />
          <div className="site-content">No Dapp found</div>
        </div>
      )}
      <ChainSelector
        className={clsx(!site && 'disabled')}
        title={
          <div>
            <div className="chain-selector-tips">
              Select a chain to connect for:
            </div>
            <div className="chain-selector-site">{site?.origin}</div>
          </div>
        }
        value={site?.chain || CHAINS_ENUM.ETH}
        onChange={handleChangeDefaultChain}
        showModal={visible}
      />
    </div>
  );
});
