import React, { useState, useEffect } from 'react';
import { useWallet, useApproval, getCurrentConnectSite } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';
import IconNoData from 'ui/assets/no-data.svg';
import IconAllSites from 'ui/assets/all-sites.svg';
import IconInternet from 'ui/assets/internet.svg';
import './style.less';

const CurrentConnection = ({ site }: { site: null | ConnectedSite }) => {
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
  const [currentConnect, setCurrentConnect] = useState<ConnectedSite | null>(
    null
  );
  const wallet = useWallet();
  const [approval] = useApproval();

  const handleClickAllSites = () => {
    // TODO
  };

  const getConnectedSites = async () => {
    const sites = await wallet.getRecentConnectedSites();
    setConnections(sites);
    const current = await getCurrentConnectSite(wallet);
    console.log('current', current);
    setCurrentConnect(current);
  };

  useEffect(() => {
    getConnectedSites();
  }, []);

  return (
    <div className="recent-connections">
      <p className="title">
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
              item={{ origin: 'all', name: 'All Sites', icon: IconAllSites }}
            />
          )}
        </div>
      ) : (
        <img className="icon icon-no-data" src={IconNoData} />
      )}
      <CurrentConnection site={currentConnect} />
    </div>
  );
};
