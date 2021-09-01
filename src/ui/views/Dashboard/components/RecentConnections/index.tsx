import React, { useState, useEffect, memo, useCallback } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useWallet, getCurrentConnectSite, openInTab } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
import { CHAINS_ENUM, CHAINS } from 'consts';
import IconInternet from 'ui/assets/internet.svg';
import { ReactComponent as IconStar } from 'ui/assets/star.svg';
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
    const { t } = useTranslation();

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
        {t('Not connected to current website')}
      </p>
    );
    const Connected = () => (
      <div className="connected flex">
        <FallbackSiteLogo url={site!.icon} origin={site!.origin} width="32px" />
        <div className="info">
          <p className="origin" title={site!.origin}>
            {site!.origin}
          </p>
          <p className="name">{t('connected')}</p>
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
    onPin,
    onUnpin,
    onPointerEnter,
    onPointerLeave,
  }: {
    item: ConnectedSite | null;
    onClick?(): void;
    onPin?(): void;
    onUnpin?(): void;
    onPointerEnter?(): void;
    onPointerLeave?(): void;
  }) => {
    return (
      <div
        className="item"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        {item ? (
          <>
            <IconStar
              className={clsx('pin-website', { block: item.isTop })}
              fill={item.isTop ? '#8697FF' : 'none'}
              onClick={item.isTop ? onUnpin : onPin}
            />
            <img
              className="connect-chain"
              src={CHAINS[item.chain]?.logo}
              alt={CHAINS[item.chain]?.name}
            />
            <div className="logo cursor-pointer">
              <FallbackSiteLogo
                url={item.icon}
                origin={item.origin}
                width="32px"
                onClick={onClick}
                style={{
                  borderRadius: '4px',
                }}
              />
            </div>
          </>
        ) : (
          <img src="/images/no-recent-connect.png" className="logo" />
        )}
      </div>
    );
  },
  (pre, next) =>
    pre.item?.origin == next.item?.origin &&
    pre.item?.chain == next.item?.chain &&
    pre.item?.isTop === next.item?.isTop
);

export default () => {
  const [connections, setConnections] = useState<(ConnectedSite | null)[]>(
    new Array(12).fill(null)
  );
  const [currentConnect, setCurrentConnect] = useState<
    ConnectedSite | null | undefined
  >(null);
  const [hoverSite, setHoverSite] = useState<string | undefined>();
  const wallet = useWallet();

  const handleClickConnection = (connection: ConnectedSite | null) => {
    if (!connection) return;
    openInTab(connection.origin);
  };

  const getConnectedSites = () => {
    const sites = wallet.getRecentConnectedSites();
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

  const handlePinWebsite = (item: ConnectedSite | null) => {
    if (!item || item.isTop) return;
    wallet.topConnectedSite(item.origin);
    getConnectedSites();
  };

  const handleUnpinWebsite = (item: ConnectedSite | null) => {
    if (!item || !item.isTop) return;
    wallet.unpinConnectedSite(item.origin);
    getConnectedSites();
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
            item={item}
            key={item?.origin || index}
            onClick={() => handleClickConnection(item)}
            onPin={() => handlePinWebsite(item)}
            onUnpin={() => handleUnpinWebsite(item)}
          />
        ))}
      </div>
      <CurrentConnection site={currentConnect} onChange={getCurrentSite} />
    </div>
  );
};
