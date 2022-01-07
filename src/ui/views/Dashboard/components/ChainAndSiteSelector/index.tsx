import React, { useState, useEffect, memo, useCallback } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import maxBy from 'lodash/maxBy';
import { useHistory } from 'react-router-dom';
import { Tooltip } from 'antd';
import { useWallet, getCurrentConnectSite } from 'ui/utils';
import { ConnectedSite } from 'background/service/permission';
import { GasLevel } from 'background/service/openapi';
import { ChainSelector, FallbackSiteLogo } from 'ui/component';
import { CHAINS_ENUM } from 'consts';
import IconDrawer from 'ui/assets/drawer.png';
import IconContacts from 'ui/assets/dashboard/contacts.png';
import IconSendToken from 'ui/assets/dashboard/sendtoken.png';
import IconSetting from 'ui/assets/dashboard/setting.png';
import IconSignedText from 'ui/assets/dashboard/signedtext.png';
import IconSingedTX from 'ui/assets/dashboard/signedtx.png';
import IconTransactions from 'ui/assets/dashboard/transactions.png';
import IconGas from 'ui/assets/dashboard/gas.svg';
import IconEth from 'ui/assets/dashboard/eth.png';
import { ReactComponent as IconLeftConer } from 'ui/assets/dashboard/leftcorner.svg';
import IconRightGoTo from 'ui/assets/dashboard/selectChain/rightgoto.svg';
import IconDot from 'ui/assets/dashboard/selectChain/dot.png';
import './style.less';
import { RecentConnections, Settings } from '../index';
const CurrentConnection = memo(
  ({
    site,
    onChange,
    showModal,
    hideModal,
    connections,
    changeURL,
  }: {
    site: null | ConnectedSite | undefined;
    onChange(): void;
    showModal?: boolean;
    hideModal(): void;
    connections: (ConnectedSite | null)[];
    changeURL(): void;
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
    return (
      <div className="current-connection">
        <IconLeftConer
          className="left-corner"
          fill={site ? '#27C193' : '#B4BDCC'}
        />
        <div className="connected flex">
          {site ? (
            <div className="connect-wrapper">
              <ChainSelector
                value={site!.chain}
                onChange={handleChangeDefaultChain}
                showModal={showModal}
                className="no-border-shadow"
              />
            </div>
          ) : (
            <p className="not-connected">{t('Not connected')}</p>
          )}

          <div className="right pointer" onClick={changeURL}>
            <div className="icon-container">
              {connections.length > 0 &&
                connections.map((item, index) => (
                  <div className="image-item" key={item?.origin}>
                    <FallbackSiteLogo
                      url={item?.icon || ''}
                      origin={item?.origin || ''}
                      width="22px"
                      className="image"
                    />
                    {index === connections.length - 1 &&
                      connections.length >= 6 && (
                        <div className="modal">
                          <img src={IconDot} className="dot" />
                        </div>
                      )}
                  </div>
                ))}
            </div>
            <img src={IconRightGoTo} className="right-icon" />
          </div>
        </div>
      </div>
    );
  }
);
export default ({
  onChange,
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
  const history = useHistory();
  const [connections, setConnections] = useState<(ConnectedSite | null)[]>(
    new Array(6).fill(null)
  );
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(0);
  const [localshowModal, setLocalShowModal] = useState(showModal);
  const [drawerAnimation, setDrawerAnimation] = useState<string | null>(null);
  const [urlVisible, setUrlVisible] = useState(false);
  const [settingVisible, setSettingVisible] = useState(false);
  const [currentConnect, setCurrentConnect] = useState<
    ConnectedSite | null | undefined
  >(null);
  const [gasPrice, setGasPrice] = useState<number>(0);
  const wallet = useWallet();

  const getConnectedSites = async () => {
    const sites = await wallet.getRecentConnectedSites();
    const topSites = sites.sort((x, y) => y.isTop - x.isTop);
    setConnections(topSites.slice(0, 6).filter(Boolean));
  };

  const getCurrentSite = useCallback(async () => {
    const current = await getCurrentConnectSite(wallet);
    setCurrentConnect(current);
  }, []);
  const hideModal = () => {
    setLocalShowModal(false);
  };
  const getGasPrice = async () => {
    const marketGas: GasLevel[] = await wallet.openapi.gasMarket('eth');
    const {
      change_percent = 0,
      last_price = 0,
    } = await wallet.openapi.tokenPrice('eth');
    setCurrentPrice(last_price);
    setPercentage(change_percent);
    const maxGas = maxBy(marketGas, (level) => level.price)!.price;
    if (maxGas) {
      setGasPrice(Number(maxGas / 1e9));
    }
  };
  const changeURL = () => {
    setUrlVisible(!urlVisible);
  };
  const changeSetting = () => {
    setSettingVisible(!settingVisible);
  };
  useEffect(() => {
    getCurrentSite();
    getGasPrice();
  }, []);
  useEffect(() => {
    if (!urlVisible) {
      getConnectedSites();
    }
  }, [urlVisible]);
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
  const directionPanelData = [
    {
      icon: IconSendToken,
      content: 'Send',
      onClick: () => history.push('/send-token'),
    },
    {
      icon: IconSingedTX,
      content: 'Signed Tx',
      onClick: () => history.push('/tx-history'),
    },
    {
      icon: IconSignedText,
      content: 'Signed Text',
      disabled: true,
    },
    {
      icon: IconTransactions,
      content: 'Transactions',
      disabled: true,
    },
    {
      icon: IconContacts,
      content: 'Contacts',
      disabled: true,
    },
    {
      icon: IconSetting,
      content: 'Settings',
      onClick: changeSetting,
    },
  ];
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
      <div className="pannel">
        <div className="direction-pannel">
          {directionPanelData.map((item, index) =>
            item.disabled ? (
              <Tooltip
                title={'Coming soon'}
                overlayClassName="rectangle direction-tooltip"
                autoAdjustOverflow={false}
              >
                <div key={index} className="disable-direction">
                  <img src={item.icon} className="images" />
                  <div>{item.content} </div>
                </div>
              </Tooltip>
            ) : (
              <div
                key={index}
                onClick={item?.onClick}
                className="direction pointer"
              >
                <img src={item.icon} className="images" />
                <div>{item.content} </div>
              </div>
            )
          )}
        </div>
        <div className="price-viewer">
          <div className="eth-price">
            <img src={IconEth} className="w-[20px] h-[20px]" />
            <div className="gasprice">{`$${currentPrice}`}</div>
            <div
              className={
                percentage > 0
                  ? 'positive'
                  : percentage === 0
                  ? 'even'
                  : 'depositive'
              }
            >
              {percentage >= 0 && '+'}
              {percentage?.toFixed(2)}%
            </div>
          </div>
          <div className="gas-container">
            <img src={IconGas} className="w-[16px] h-[16px]" />
            <div className="gasprice">{`${gasPrice}`}</div>
            <div className="gwei">Gwei</div>
          </div>
        </div>
      </div>
      <CurrentConnection
        site={currentConnect}
        showModal={localshowModal}
        onChange={getCurrentSite}
        hideModal={hideModal}
        connections={connections}
        changeURL={changeURL}
      />
      <Settings visible={settingVisible} onClose={changeSetting} />
      <RecentConnections visible={urlVisible} onClose={changeURL} />
    </div>
  );
};
