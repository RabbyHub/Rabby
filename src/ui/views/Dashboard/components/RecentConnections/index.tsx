import React, { useState, useEffect } from 'react';
import { useWallet, useApproval, getCurrentConnectSite } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';
import { ChainSelector } from 'ui/component';
import { CHAINS_ENUM } from 'consts';
import IconNoData from 'ui/assets/no-data.svg';
import IconAllSites from 'ui/assets/all-sites.svg';
import IconInternet from 'ui/assets/internet.svg';
import './style.less';

const CurrentConnection = ({
  site,
  onChange,
}: {
  site: null | ConnectedSite | undefined;
  onChange(): void;
}) => {
  const wallet = useWallet();

  const handleChangeDefaultChain = (chain: CHAINS_ENUM) => {
    wallet.updateConnectSite(site!.origin, {
      ...site!,
      chain,
    });
    onChange();
  };

  const NoConnected = () => (
    <p className="not-connected">
      <img src={IconInternet} className="icon icon-no-connect" />
      Not connected
    </p>
  );
  const Connected = () => (
    <div className="connected flex">
      <img src={site!.icon} className="logo" />
      <div className="info">
        <p className="origin">{site!.origin}</p>
        <p className="name">{site!.name}</p>
      </div>
      <ChainSelector value={site!.chain} onChange={handleChangeDefaultChain} />
    </div>
  );
  return (
    <div className="current-connection">
      {site ? <Connected /> : <NoConnected />}
    </div>
  );
};

const ConnectionItem = ({
  item,
  onClick,
}: {
  item: ConnectedSite;
  onClick?(): void;
}) => {
  return (
    <div
      className="item"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'inherit' }}
    >
      <img src={item.icon} alt={item.name} className="logo" />
      <p className="name">{item.name}</p>
    </div>
  );
};

export default () => {
  const [connections, setConnections] = useState<ConnectedSite[]>([]);
  const [currentConnect, setCurrentConnect] = useState<
    ConnectedSite | null | undefined
  >(null);
  const wallet = useWallet();
  const [approval] = useApproval();

  const handleClickAllSites = () => {
    // TODO
  };

  const getCurrentSite = async () => {
    const current = await getCurrentConnectSite(wallet);
    setCurrentConnect(current);
  };

  const getConnectedSites = async () => {
    const sites = await wallet.getRecentConnectedSites();
    setConnections(sites);
    await getCurrentSite();
  };

  useEffect(() => {
    getConnectedSites();
  }, []);

  return (
    <div className="recent-connections">
      <p className="title mb-0">
        {connections.length > 0
          ? 'Recently connected'
          : 'Not connected to any sites yet'}
      </p>
      {connections.length > 0 ? (
        <div className="list">
          {connections.map((item) => (
            <ConnectionItem item={item} key={item.origin} />
          ))}
          {connections.length >= 5 && (
            <ConnectionItem
              onClick={handleClickAllSites}
              item={{
                origin: 'all',
                name: 'All Sites',
                icon: IconAllSites,
                chain: CHAINS_ENUM.ETH,
              }}
            />
          )}
        </div>
      ) : (
        <img className="icon icon-no-data" src={IconNoData} />
      )}
      <CurrentConnection site={currentConnect} onChange={getCurrentSite} />
    </div>
  );
};
