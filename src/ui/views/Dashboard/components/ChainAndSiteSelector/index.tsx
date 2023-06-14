import { Badge, message, Skeleton, Tooltip } from 'antd';
import { GasLevel } from 'background/service/openapi';
import { ConnectedSite } from 'background/service/permission';
import clsx from 'clsx';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { matomoRequestEvent } from '@/utils/matomo-request';
import IconAlertRed from 'ui/assets/alert-red.svg';
import IconDapps from 'ui/assets/dapps.svg';
import IconGas from 'ui/assets/dashboard/gas.svg';
import IconQuene from 'ui/assets/dashboard/quene.svg';
import IconSecurity from 'ui/assets/dashboard/security.svg';
import IconSendToken from 'ui/assets/dashboard/sendtoken.png';
import IconSetting from 'ui/assets/dashboard/setting.png';
import IconSwap from 'ui/assets/dashboard/swap.svg';
import IconReceive from 'ui/assets/dashboard/receive.svg';
import IconGasTopUp from 'ui/assets/dashboard/gas-top-up.svg';
import IconTransactions from 'ui/assets/dashboard/transactions.png';
import IconAddresses from 'ui/assets/dashboard/addresses.svg';
import IconDrawer from 'ui/assets/drawer.png';
import { getCurrentConnectSite, splitNumberByStep, useWallet } from 'ui/utils';
import { CurrentConnection } from '../CurrentConnection';
import ChainSelectorModal from 'ui/component/ChainSelector/Modal';
import { RecentConnections, Settings } from '../index';
import './style.less';
import { CHAINS, CHAINS_ENUM } from '@/constant';
import { useAsync } from 'react-use';
import { useRabbySelector } from '@/ui/store';

export default ({
  gnosisPendingCount,
  onChange,
  connectionAnimation,
  showDrawer,
  hideAllList,
  isGnosis,
  setDashboardReload,
}: {
  onChange(site: ConnectedSite | null | undefined): void;
  showChain?: boolean;
  connectionAnimation?: string;
  showDrawer?: boolean;
  hideAllList?(): void;
  isGnosis: boolean;
  higherBottom: boolean;
  pendingTxCount?: number;
  gnosisPendingCount?: number;
  setDashboardReload(): void;
}) => {
  const history = useHistory();
  const [currentConnectedSiteChain, setCurrentConnectedSiteChain] = useState(
    CHAINS_ENUM.ETH
  );
  const [drawerAnimation, setDrawerAnimation] = useState<string | null>(null);
  const [urlVisible, setUrlVisible] = useState(false);
  const [settingVisible, setSettingVisible] = useState(false);
  const [currentConnect, setCurrentConnect] = useState<
    ConnectedSite | null | undefined
  >(null);
  const { state } = useLocation<{
    trigger?: string;
    showChainsModal?: boolean;
  }>();
  const { showChainsModal = false, trigger } = state ?? {};
  const [isShowReceiveModal, setIsShowReceiveModal] = useState(
    trigger === 'receive' && showChainsModal
  );
  const wallet = useWallet();

  const account = useRabbySelector((state) => state.account.currentAccount);

  const [approvalRiskAlert, setApprovalRiskAlert] = useState(0);

  const { value: approvalState } = useAsync(async () => {
    if (account?.address) {
      const data = await wallet.openapi.approvalStatus(account.address);
      return data;
    }
    return;
  }, [account?.address]);

  useEffect(() => {
    if (approvalState) {
      setApprovalRiskAlert(
        approvalState.reduce(
          (pre, now) =>
            pre + now.nft_approval_danger_cnt + now.token_approval_danger_cnt,
          0
        )
      );
    } else {
      setApprovalRiskAlert(0);
    }
  }, [approvalState]);

  const getCurrentSite = useCallback(async () => {
    const current = await getCurrentConnectSite(wallet);
    setCurrentConnect(current);
  }, []);

  const currentConnectedSiteChainNativeToken = useMemo(
    () =>
      currentConnectedSiteChain
        ? CHAINS?.[currentConnectedSiteChain]?.nativeTokenAddress || 'eth'
        : 'eth',
    [currentConnectedSiteChain]
  );

  const {
    value: gasPrice = 0,
    loading: gasPriceLoading,
  } = useAsync(async () => {
    try {
      const marketGas: GasLevel[] = await wallet.openapi.gasMarket(
        currentConnectedSiteChainNativeToken
      );
      const selectedGasPice = marketGas.find((item) => item.level === 'slow')
        ?.price;
      if (selectedGasPice) {
        return Number(selectedGasPice / 1e9);
      }
    } catch (e) {
      // DO NOTHING
    }
  }, [currentConnectedSiteChainNativeToken]);

  const { value: tokenLogo, loading: tokenLoading } = useAsync(async () => {
    try {
      const data = await wallet.openapi.getToken(
        account!.address,
        CHAINS[currentConnectedSiteChain].serverId,
        CHAINS[currentConnectedSiteChain].nativeTokenAddress
      );
      return (
        data?.logo_url || CHAINS[currentConnectedSiteChain].nativeTokenLogo
      );
    } catch (error) {
      return CHAINS[currentConnectedSiteChain].nativeTokenLogo;
    }
  }, [currentConnectedSiteChain]);

  const {
    value: tokenPrice,
    loading: currentPriceLoading,
  } = useAsync(async () => {
    try {
      const {
        change_percent = 0,
        last_price = 0,
      } = await wallet.openapi.tokenPrice(currentConnectedSiteChainNativeToken);

      return { currentPrice: last_price, percentage: change_percent };
    } catch (e) {
      return {
        currentPrice: null,
        percentage: null,
      };
    }
  }, [currentConnectedSiteChainNativeToken]);

  const { currentPrice = null, percentage = null } = tokenPrice || {};

  const changeURL = () => {
    setUrlVisible(!urlVisible);
  };

  const changeSetting = () => {
    setSettingVisible(!settingVisible);
    setDashboardReload();
  };

  useEffect(() => {
    getCurrentSite();
  }, []);

  useEffect(() => {
    if (currentConnect?.chain) {
      setCurrentConnectedSiteChain(currentConnect?.chain);
    }
  }, [currentConnect?.chain]);

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

  type IPanelItem = {
    icon: string;
    content: string;
    onClick: import('react').MouseEventHandler<HTMLElement>;
    badge?: number;
    badgeAlert?: boolean;
    iconSpin?: boolean;
    hideForGnosis?: boolean;
    showAlert?: boolean;
    disabled?: boolean;
    commingSoonBadge?: boolean;
    disableReason?: string;
  };

  const panelItems: Record<string, IPanelItem> = {
    swap: {
      icon: IconSwap,
      content: 'Swap',
      onClick: () => {
        history.push('/dex-swap?rbisource=dashboard');
      },
    },
    send: {
      icon: IconSendToken,
      content: 'Send',
      onClick: () => history.push('/send-token?rbisource=dashboard'),
    },
    receive: {
      icon: IconReceive,
      content: 'Receive',
      onClick: () => {
        setIsShowReceiveModal(true);
      },
    },
    gasTopUp: {
      icon: IconGasTopUp,
      content: 'Gas Top Up',
      onClick: () => {
        history.push('/gas-top-up');
      },
    },
    queue: {
      icon: IconQuene,
      content: 'Queue',
      badge: gnosisPendingCount,
      onClick: () => {
        history.push('/gnosis-queue');
      },
    },
    transactions: {
      icon: IconTransactions,
      content: 'Transactions',
      onClick: () => {
        history.push('/history');
      },
    },
    dapps: {
      icon: IconDapps,
      content: 'Connected',
      onClick: () => {
        changeURL();
      },
    },
    security: {
      icon: IconSecurity,
      content: 'Approvals',
      onClick: () => {
        history.push('/approval-manage');
      },
      badge: approvalRiskAlert,
      badgeAlert: approvalRiskAlert > 0,
    },
    settings: {
      icon: IconSetting,
      content: 'Settings',
      onClick: changeSetting,
    },
    address: {
      icon: IconAddresses,
      content: 'Manage Address',
      onClick: () => {
        history.push('/settings/address');
      },
    },
  };

  let pickedPanelKeys: (keyof typeof panelItems)[] = [];

  if (isGnosis) {
    pickedPanelKeys = [
      'swap',
      'send',
      'receive',
      'gasTopUp',
      // 'queue',
      'transactions',
      'dapps',
      'security',
      'address',
      'settings',
    ];
  } else {
    pickedPanelKeys = [
      'swap',
      'send',
      'receive',
      'gasTopUp',
      'transactions',
      'dapps',
      'security',
      'address',
      'settings',
    ];
  }

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
          {pickedPanelKeys.map((panelKey, index) => {
            const item = panelItems[panelKey] as IPanelItem;
            if (item.hideForGnosis && isGnosis) return <></>;
            return item.disabled ? (
              <Tooltip
                {...(item.commingSoonBadge && { visible: false })}
                title={item.disableReason || 'Coming soon'}
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
                onClick={(evt) => {
                  matomoRequestEvent({
                    category: 'Dashboard',
                    action: 'clickEntry',
                    label: item.content,
                  });
                  item?.onClick(evt);
                }}
                className="direction pointer"
              >
                {item.showAlert && (
                  <img src={IconAlertRed} className="icon icon-alert" />
                )}
                {item.badge ? (
                  <Badge
                    count={item.badge}
                    size="small"
                    className={item.badgeAlert ? 'alert' : ''}
                  >
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
                {item.commingSoonBadge && (
                  <div className="coming-soon-badge">Soon</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="price-viewer">
          <div className="eth-price">
            {tokenLoading ? (
              <Skeleton.Avatar size={20} active shape="circle" />
            ) : (
              <img src={tokenLogo} className="w-[20px] h-[20px] rounded-full" />
            )}
            {currentPriceLoading ? (
              <Skeleton.Button active={true} />
            ) : (
              <>
                <div className="gasprice">
                  {currentPrice !== null
                    ? currentPrice < 0.01
                      ? '<$0.01'
                      : `$${splitNumberByStep(currentPrice.toFixed(2))}`
                    : '-'}
                </div>
                {percentage !== null && (
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
                )}
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
      <CurrentConnection
        onChainChange={(chain) => {
          setCurrentConnectedSiteChain(chain);
          if (currentConnect) {
            onChange({
              ...currentConnect,
              chain,
            });
          }
        }}
      />
      <ChainSelectorModal
        className="receive-chain-select-modal"
        value={CHAINS_ENUM.ETH}
        visible={isShowReceiveModal}
        onChange={(chain) => {
          history.push(`/receive?rbisource=dashboard&chain=${chain}`);
          setIsShowReceiveModal(false);
        }}
        onCancel={() => {
          setIsShowReceiveModal(false);
        }}
      />
      <Settings visible={settingVisible} onClose={changeSetting} />
      <RecentConnections visible={urlVisible} onClose={changeURL} />
    </div>
  );
};
