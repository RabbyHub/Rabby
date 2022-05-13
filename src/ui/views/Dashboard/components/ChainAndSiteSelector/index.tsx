import eventBus from '@/eventBus';
import { Badge, Skeleton, Tooltip } from 'antd';
import { GasLevel } from 'background/service/openapi';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import maxBy from 'lodash/maxBy';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import IconAlertRed from 'ui/assets/alert-red.svg';
import IconDapps from 'ui/assets/dapps.svg';
import IconContacts from 'ui/assets/dashboard/contacts.png';
import IconEth from 'ui/assets/dashboard/eth.png';
import IconGas from 'ui/assets/dashboard/gas.svg';
import IconQuene from 'ui/assets/dashboard/quene.svg';
import IconSecurity from 'ui/assets/dashboard/security.svg';
import IconSendToken from 'ui/assets/dashboard/sendtoken.png';
import IconSetting from 'ui/assets/dashboard/setting.png';
import IconActivities from 'ui/assets/dashboard/activities.svg';
import IconActivitiesPending from 'ui/assets/dashboard/activities-pending.svg';
import IconReceive from 'ui/assets/dashboard/receive.svg';
import IconTransactions from 'ui/assets/dashboard/transactions.png';
import IconWidget from 'ui/assets/dashboard/widget.svg';
import IconDrawer from 'ui/assets/drawer.png';
import { getCurrentConnectSite, splitNumberByStep, useWallet } from 'ui/utils';
import { CurrentConnection } from '../CurrentConnection';
import ChainSelectorModal from 'ui/component/ChainSelector/Modal';
import {
  Contacts,
  RecentConnections,
  Security,
  Settings,
  Widget,
} from '../index';
import './style.less';
import { CHAINS_ENUM } from '@/constant';

export default ({
  pendingTxCount,
  gnosisPendingCount,
  onChange,
  connectionAnimation,
  showDrawer,
  hideAllList,
  showModal = false,
  isGnosis,
  setDashboardReload,
}: {
  onChange(site: ConnectedSite | null | undefined): void;
  showChain?: boolean;
  connectionAnimation?: string;
  showDrawer?: boolean;
  hideAllList?(): void;
  showModal?: boolean;
  isGnosis: boolean;
  higherBottom: boolean;
  pendingTxCount?: number;
  gnosisPendingCount?: number;
  setDashboardReload(): void;
}) => {
  const history = useHistory();
  const [connections, setConnections] = useState<(ConnectedSite | null)[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [currentPriceLoading, setCurrentPriceLoading] = useState(false);
  const [percentage, setPercentage] = useState<number>(0);
  const [localshowModal, setLocalShowModal] = useState(showModal);
  const [drawerAnimation, setDrawerAnimation] = useState<string | null>(null);
  const [urlVisible, setUrlVisible] = useState(false);
  const [settingVisible, setSettingVisible] = useState(false);
  const [widgetVisible, setWidgetVisible] = useState(false);
  const [contactsVisible, setContactsVisible] = useState(false);
  const [securityVisible, setSecurityVisible] = useState(false);
  const [currentConnect, setCurrentConnect] = useState<
    ConnectedSite | null | undefined
  >(null);
  const [gasPrice, setGasPrice] = useState<number>(0);
  const [gasPriceLoading, setGasPriceLoading] = useState(false);
  const [isDefaultWallet, setIsDefaultWallet] = useState(true);
  const [isShowReceiveModal, setIsShowReceiveModal] = useState(false);
  const wallet = useWallet();

  const getConnectedSites = async () => {
    const sites = await wallet.getRecentConnectedSites();
    setConnections(sites.slice(0, 6));
  };

  const getCurrentSite = useCallback(async () => {
    const current = await getCurrentConnectSite(wallet);
    setCurrentConnect(current);
  }, []);

  const hideModal = () => {
    setLocalShowModal(false);
  };

  const getGasPrice = async () => {
    try {
      setGasPriceLoading(true);
      const marketGas: GasLevel[] = await wallet.openapi.gasMarket('eth');
      const maxGas = maxBy(marketGas, (level) => level.price)!.price;
      if (maxGas) {
        setGasPrice(Number(maxGas / 1e9));
      }
      setGasPriceLoading(false);
    } catch (e) {
      // DO NOTHING
    }
  };

  const getETHPrice = async () => {
    try {
      setCurrentPriceLoading(true);
      const {
        change_percent = 0,
        last_price = 0,
      } = await wallet.openapi.tokenPrice('eth');
      setCurrentPrice(last_price);
      setPercentage(change_percent);
      setCurrentPriceLoading(false);
    } catch (e) {
      // DO NOTHING
    }
  };
  const getPrice = () => {
    getGasPrice();
    getETHPrice();
  };

  const changeURL = () => {
    setUrlVisible(!urlVisible);
  };

  const changeSetting = () => {
    setSettingVisible(!settingVisible);
    setDashboardReload();
  };

  const changeWidget = () => {
    setWidgetVisible(!widgetVisible);
  };

  const changeContacts = () => {
    setContactsVisible(!contactsVisible);
    setDashboardReload();
  };

  const changeSecurity = () => {
    setSecurityVisible(!securityVisible);
  };

  const defaultWalletChangeHandler = (val: boolean) => {
    setIsDefaultWallet(val);
  };

  useEffect(() => {
    getCurrentSite();
    getPrice();
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

  useEffect(() => {
    wallet.isDefaultWallet().then((result) => {
      setIsDefaultWallet(result);
    });
    eventBus.addEventListener(
      'isDefaultWalletChanged',
      defaultWalletChangeHandler
    );
    return () => {
      eventBus.removeEventListener(
        'isDefaultWalletChanged',
        defaultWalletChangeHandler
      );
    };
  }, []);

  const directionPanelData: {
    icon: string;
    content: string;
    onClick: import('react').MouseEventHandler<HTMLElement>;
    badge?: number;
    iconSpin?: boolean;
    hideForGnosis?: boolean;
    showAlert?: boolean;
  }[] = [
    {
      icon: IconSendToken,
      content: 'Send',
      onClick: () => history.push('/send-token'),
    },
    {
      icon: IconReceive,
      content: 'Receive',
      onClick: () => {
        setIsShowReceiveModal(true);
      },
    },
    isGnosis
      ? {
          icon: IconQuene,
          content: 'Queue',
          badge: gnosisPendingCount,
          onClick: () => {
            history.push('/gnosis-queue');
          },
        }
      : {
          icon: pendingTxCount ? IconActivitiesPending : IconActivities,
          content: 'Activities',
          badge: pendingTxCount,
          iconSpin: !!pendingTxCount,
          onClick: () => {
            history.push('/activities');
          },
        },
    {
      icon: IconTransactions,
      content: 'Transactions',
      onClick: () => {
        history.push('/history');
      },
    },
    {
      icon: IconDapps,
      content: 'Dapps',
      onClick: () => {
        changeURL();
      },
    },
    {
      icon: IconContacts,
      content: 'Contacts',
      onClick: changeContacts,
    },
    {
      icon: IconSecurity,
      content: 'Security',
      onClick: changeSecurity,
    },
    {
      icon: IconWidget,
      content: 'Widget',
      onClick: changeWidget,
    },
    {
      icon: IconSetting,
      content: 'Settings',
      onClick: changeSetting,
      showAlert: !isDefaultWallet,
    },
  ].filter(Boolean);

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
          {directionPanelData.map((item, index) => {
            if (item.hideForGnosis && isGnosis) return <></>;
            return (item as Record<string, any>).disabled ? (
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
                {item.showAlert && (
                  <img src={IconAlertRed} className="icon icon-alert" />
                )}
                {item.badge ? (
                  <Badge count={item.badge} size="small">
                    <img
                      src={item.icon}
                      className={[item.iconSpin && 'icon-spin', 'images']
                        .filter(Boolean)
                        .join(' ')}
                    />
                  </Badge>
                ) : (
                  <img src={item.icon} className="images" />
                )}
                <div>{item.content} </div>
              </div>
            );
          })}
        </div>
        <div className="price-viewer">
          <div className="eth-price">
            <img src={IconEth} className="w-[20px] h-[20px]" />
            {currentPriceLoading ? (
              <Skeleton.Button active={true} />
            ) : (
              <>
                <div className="gasprice">{`$${splitNumberByStep(
                  currentPrice
                )}`}</div>
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
              </>
            )}
          </div>
          <div className="gas-container">
            <img src={IconGas} className="w-[16px] h-[16px]" />
            {gasPriceLoading ? (
              <Skeleton.Button active={true} />
            ) : (
              <>
                <div className="gasprice">{`${splitNumberByStep(
                  gasPrice
                )}`}</div>
                <div className="gwei">Gwei</div>
              </>
            )}
          </div>
        </div>
      </div>
      <CurrentConnection />
      <ChainSelectorModal
        offset={-22}
        className="receive-chain-select-modal"
        value={CHAINS_ENUM.ETH}
        title="Select the chain to receive assets"
        visible={isShowReceiveModal}
        onChange={(chain) => {
          history.push(`/receive?chain=${chain}`);
          setIsShowReceiveModal(false);
        }}
        onCancel={() => {
          setIsShowReceiveModal(false);
        }}
      />
      <Settings visible={settingVisible} onClose={changeSetting} />
      <Contacts visible={contactsVisible} onClose={changeContacts} />
      <RecentConnections visible={urlVisible} onClose={changeURL} />
      <Security visible={securityVisible} onClose={changeSecurity} />
      <Widget visible={widgetVisible} onClose={changeWidget} />
    </div>
  );
};
