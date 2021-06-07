import React, { useState, useEffect } from 'react';
import { Popover } from 'antd';
import { browser } from 'webextension-polyfill-ts';
import { useWallet, getCurrentConnectSite } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';
import { ChainSelector } from 'ui/component';
import { CHAINS_ENUM, CHAINS } from 'consts';
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
      Not connected to current website
    </p>
  );
  const Connected = () => (
    <div className="connected flex">
      <img src={site!.icon} className="logo" />
      <div className="info">
        <p className="origin" title={site!.origin}>
          {site!.origin}
        </p>
        <p className="name" title={site!.name}>
          {site!.name}
        </p>
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
  item: ConnectedSite | null;
  onClick?(): void;
}) => {
  if (!item) {
    return (
      <div
        className="item"
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'inherit' }}
      >
        <img src="/images/no-recent-connect.png" className="logo" />
      </div>
    );
  }
  const popoverContent = (
    <div className="connect-site-popover">
      <p className="origin">{item.origin}</p>
      <p className="text-gray-content">{item.name}</p>
    </div>
  );
  return (
    <Popover content={popoverContent} placement="topLeft">
      <div
        className="item"
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'inherit' }}
      >
        <img
          className="connect-chain"
          src={CHAINS[item.chain].logo}
          alt={CHAINS[item.chain].name}
        />
        <img src={item.icon} className="logo" />
      </div>
    </Popover>
  );
};

export default () => {
  const [connections, setConnections] = useState<(ConnectedSite | null)[]>([]);
  const [currentConnect, setCurrentConnect] = useState<
    ConnectedSite | null | undefined
  >(null);
  const wallet = useWallet();

  const handleClickConnection = (connection: ConnectedSite | null) => {
    if (!connection) return;
    browser.tabs.create({
      url: connection.origin,
    });
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
      <div className="list">
        {connections.map((item) => (
          <ConnectionItem
            item={item}
            key={item?.origin || Date.now() * Math.random()}
            onClick={() => handleClickConnection(item)}
          />
        ))}
      </div>
      <CurrentConnection site={currentConnect} onChange={getCurrentSite} />
    </div>
  );
};
