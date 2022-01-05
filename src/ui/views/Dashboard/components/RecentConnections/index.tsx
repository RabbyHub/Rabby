import React, { useState, useEffect, memo, useCallback } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import maxBy from 'lodash/maxBy';

import { useWallet, getCurrentConnectSite, openInTab } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';
import { GasLevel } from 'background/service/openapi';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
import { CHAINS_ENUM, CHAINS } from 'consts';
import IconInternet from 'ui/assets/internet.svg';
import { ReactComponent as IconStar } from 'ui/assets/star.svg';
import IconDrawer from 'ui/assets/drawer.png';
import IconContacts from 'ui/assets/dashboard/contacts.png';
import IconSendToken from 'ui/assets/dashboard/sendtoken.png';
import IconSetting from 'ui/assets/dashboard/setting.png';
import IconSignedText from 'ui/assets/dashboard/signedtext.png';
import IconSingedTX from 'ui/assets/dashboard/signedtx.png';
import IconTransactions from 'ui/assets/dashboard/transactions.png';
import IconGas from 'ui/assets/dashboard/gas.svg';
import IconEth from 'ui/assets/dashboard/eth.png';

import './style.less';

const directionPanelData = [
  {
    icon: IconSendToken,
    content: 'send',
    onClick: () => console.log(111),
  },
  {
    icon: IconSingedTX,
    content: 'Signed Tx',
    onClick: () => console.log(111),
  },
  {
    icon: IconSignedText,
    content: 'Signed Text',
    onClick: () => console.log(111),
  },
  {
    icon: IconTransactions,
    content: 'Transactions',
    onClick: () => console.log(111),
  },
  {
    icon: IconContacts,
    content: 'Contacts',
    onClick: () => console.log(111),
  },
  {
    icon: IconSetting,
    content: 'Settings',
    onClick: () => console.log(111),
  },
];
const CurrentConnection = memo(
  ({
    site,
    onChange,
    showModal,
    hideModal,
  }: {
    site: null | ConnectedSite | undefined;
    onChange(): void;
    showModal?: boolean;
    hideModal(): void;
  }) => {
    const wallet = useWallet();
    const { t } = useTranslation();

    const handleChangeDefaultChain = (chain: CHAINS_ENUM) => {
      wallet.updateConnectSite(site!.origin, {
        ...site!,
        chain,
      });
      onChange();
      hideModal();
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
          showModal={showModal}
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

export default ({
  onChange,
  showChain,
  connectionAnimation,
  showDrawer,
  hideAllList,
  showModal = false,
}: {
  onChange(site: ConnectedSite | null | undefined): void;
  showChain?: boolean;
  connectionAnimation?: string;
  showDrawer?: boolean;
  hideAllList?(): void;
  showModal?: boolean;
}) => {
  const [connections, setConnections] = useState<(ConnectedSite | null)[]>(
    new Array(12).fill(null)
  );
  const [localshowModal, setLocalShowModal] = useState(showModal);
  const [drawerAnimation, setDrawerAnimation] = useState<string | null>(null);
  const [currentConnect, setCurrentConnect] = useState<
    ConnectedSite | null | undefined
  >(null);
  const [hoverSite, setHoverSite] = useState<string | undefined>();
  const [gasPrice, setGasPrice] = useState<number>(0);
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
  const hideModal = () => {
    setLocalShowModal(false);
  };
  const getGasPrice = async () => {
    const marketGas: GasLevel[] = await wallet.openapi.gasMarket('eth');
    const maxGas = maxBy(marketGas, (level) => level.price)!.price;
    if (maxGas) {
      setGasPrice(Number(maxGas / 1e9));
    }
  };

  useEffect(() => {
    getCurrentSite();
    getGasPrice();
  }, []);

  useEffect(() => {
    onChange(currentConnect);
  }, [currentConnect]);
  useEffect(() => {
    if (showDrawer) {
      setDrawerAnimation('fadeInDrawer');
    } else {
      if (drawerAnimation) {
        setTimeout(() => {
          setDrawerAnimation('fadeOutDrawer');
        }, 100);
      }
    }
  }, [showDrawer]);
  return (
    <div className={clsx('recent-connections', connectionAnimation)}>
      <img
        src={IconDrawer}
        className={clsx(
          'bottom-drawer',
          drawerAnimation,
          drawerAnimation === 'fadeInDrawer' ? 'h-[40px] z-10' : 'h-[0] z-0'
        )}
        onClick={hideAllList}
      />
      {/* <div className="mb-[17px] text-12 text-gray-content h-14 text-center">
        {hoverSite}
      </div> */}
      <div className="pannel">
        <div className="direction-pannel">
          {directionPanelData.map((item, index) => (
            <div key={index} onClick={item.onClick} className="direction">
              <img src={item.icon} className="images" />
              <div>{item.content} </div>
            </div>
          ))}
        </div>
        <div className="price-viewer">
          <div className="eth-price">
            <img src={IconEth} className="w-[20px] h-[20px]" />
            <div className="gasprice">{`$${gasPrice}`}</div>
            <div className="gwei">Gwei</div>
          </div>
          <div className="gas-container">
            <img src={IconGas} className="w-[16px] h-[16px]" />
            <div className="gasprice">{`${gasPrice}`}</div>
            <div className="gwei">Gwei</div>
          </div>
        </div>
      </div>
      {/* <div className="list">
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
      </div> */}
      <CurrentConnection
        site={currentConnect}
        showModal={localshowModal}
        onChange={getCurrentSite}
        hideModal={hideModal}
      />
    </div>
  );
};
