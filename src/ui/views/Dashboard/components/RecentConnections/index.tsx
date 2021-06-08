import React, { useState, useEffect, useRef } from 'react';
import { Popover } from 'antd';
import { TooltipPlacement } from 'antd/lib/tooltip';
// import positions from 'positions';
import { browser } from 'webextension-polyfill-ts';
import { useWallet, getCurrentConnectSite } from 'ui/utils';
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
  index,
}: {
  item: ConnectedSite | null;
  onClick?(): void;
  index: number;
}) => {
  let placement: TooltipPlacement = 'top';
  if (index % 4 === 0) {
    placement = 'right';
  } else if (index % 4 === 3) {
    placement = 'left';
  }
  if (!item) {
    const popoverContent = (
      <div className="connect-site-popover">
        <p className="text-gray-content">
          Recently used websites will be recorded
        </p>
      </div>
    );
    return (
      <Popover
        content={popoverContent}
        placement={placement}
        arrowPointAtCenter
      >
        <div className="item" onClick={onClick} style={{ cursor: 'inherit' }}>
          <img src="/images/no-recent-connect.png" className="logo" />
        </div>
      </Popover>
    );
  }

  const triggerEl = useRef<HTMLDivElement>(null);
  const popoverContent = (
    <div className="connect-site-popover">
      <p className="origin">{item.origin}</p>
      <p className="text-gray-content">{item.name}</p>
    </div>
  );
  /* for backup
  const handlePopoverVisibleChange = (visible: boolean) => {
    if (visible) {
      setTimeout(() => {
        // currently workaround for https://github.com/ant-design/ant-design/issues/7038
        // TODO: create PR to antd to fix this
        const el = document.querySelector(
          '.ant-popover:not(.ant-popover-hidden)'
        )!;
        const onAnimationEnd = function (this: HTMLDivElement) {
          const arrowCopy = document
            .querySelector('.ant-popover:not(.ant-popover-hidden)')!
            .querySelector<HTMLDivElement>('.ant-popover-arrow')!;
          const css = positions(
            arrowCopy,
            'bottom center',
            triggerEl.current,
            'top center'
          );
          const { left } = css;
          console.log(left);
          arrowCopy.style.left = left + 'px';
          arrowCopy.style.transform = 'rotate(45deg)';
          el.removeEventListener('animationend', onAnimationEnd);
        };
        el.addEventListener('animationend', onAnimationEnd);
      });
    }
  };
  */
  return (
    <Popover
      content={popoverContent}
      placement={placement}
      arrowPointAtCenter
      // onVisibleChange={handlePopoverVisibleChange}
    >
      <div
        className="item"
        onClick={onClick}
        style={{ cursor: onClick ? 'pointer' : 'inherit' }}
        ref={triggerEl}
      >
        <img
          className="connect-chain"
          src={CHAINS[item.chain].logo}
          alt={CHAINS[item.chain].name}
        />
        <div className="logo">
          <FallbackSiteLogo
            url={item.icon}
            origin={item.origin}
            width="32px"
            height="32px"
          />
        </div>
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
        {connections.map((item, index) => (
          <ConnectionItem
            index={index}
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
