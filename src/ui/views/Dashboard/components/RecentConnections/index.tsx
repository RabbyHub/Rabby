import React, { useState, useEffect, memo, useCallback } from 'react';
import { useWallet, getCurrentConnectSite, openInTab } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
import { CHAINS_ENUM, CHAINS } from 'consts';
import IconInternet from 'ui/assets/internet.svg';
import './style.less';

const CurrentConnection = memo(
  ({
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
        <ChainSelector
          value={site!.chain}
          onChange={handleChangeDefaultChain}
        />
      </div>
    );
    return (
      <div className="current-connection">
        {site ? <Connected /> : <NoConnected />}
      </div>
    );
  }
);

const ConnectionItem = memo(
  ({
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
            <FallbackSiteLogo
              url={item.icon}
              origin={item.origin}
              width="32px"
            />
          </div>
        </>
      ) : (
        <img src="/images/no-recent-connect.png" className="logo" />
      )}
    </div>
  ),
  (pre, next) =>
    pre.item?.origin == next.item?.origin && pre.item?.chain == next.item?.chain
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

  const getCurrentSite = useCallback(async () => {
    const current = await getCurrentConnectSite(wallet);
    setCurrentConnect(current);
    getConnectedSites();
  }, []);

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
        {connections.map((item, index) => (
          <ConnectionItem
            data-item={item}
            onPointerEnter={() => showHoverSite(item)}
            onPointerLeave={() => showHoverSite()}
            onClick={() => handleClickConnection(item)}
            item={item}
            key={item?.origin || index}
          />
        ))}
      </div>
      <CurrentConnection site={currentConnect} onChange={getCurrentSite} />
    </div>
  );
};
