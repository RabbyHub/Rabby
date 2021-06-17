import React, { useState, useEffect } from 'react';
import { useWallet, getCurrentConnectSite, openInTab } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
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
      <FallbackSiteLogo url={site!.icon} origin={site!.origin} width="32px" />
      <div className="info">
        <p className="origin" title={site!.origin}>
          {site!.origin}
        </p>
        <p className="name">connected</p>
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
  onPointerEnter,
  onPointerLeave,
}: {
  item: ConnectedSite | null;
  onClick?(): void;
  onPointerEnter?(): void;
  onPointerLeave?(): void;
}) => (
  <div
    className="item"
    onClick={onClick}
    onPointerEnter={onPointerEnter}
    onPointerLeave={onPointerLeave}
  >
    {item ? (
      <>
        <img
          className="connect-chain"
          src={CHAINS[item.chain].logo}
          alt={CHAINS[item.chain].name}
        />
        <div className="logo cursor-pointer">
          <FallbackSiteLogo url={item.icon} origin={item.origin} width="32px" />
        </div>
      </>
    ) : (
      <img src="/images/no-recent-connect.png" className="logo" />
    )}
  </div>
);

export default () => {
  const [connections, setConnections] = useState<(ConnectedSite | null)[]>([]);
  const [currentConnect, setCurrentConnect] = useState<
    ConnectedSite | null | undefined
  >(null);
  const [hoverSite, setHoverSite] = useState<string | undefined>();
  const wallet = useWallet();

  const handleClickConnection = (connection: ConnectedSite | null) => {
    if (!connection) return;
    openInTab(connection.origin);
  };

  const getConnectedSites = async () => {
    const sites = await wallet.getRecentConnectedSites();
    setConnections(sites);
  };

  const getCurrentSite = async () => {
    const current = await getCurrentConnectSite(wallet);
    setCurrentConnect(current);
    getConnectedSites();
  };

  const showHoverSite = (item?: ConnectedSite | null) => {
    setHoverSite(item?.origin);
  };

  useEffect(() => {
    getCurrentSite();
  }, []);

  return (
    <div className="recent-connections">
      <div className="mb-[17px] text-12 text-gray-content h-14 text-center">
        {hoverSite}
      </div>
      <div className="list">
        {connections.map((item) => (
          <ConnectionItem
            onPointerEnter={() => showHoverSite(item)}
            onPointerLeave={() => showHoverSite()}
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
