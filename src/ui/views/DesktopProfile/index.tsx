import React, { useMemo, useState, useRef, useEffect } from 'react';

import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { DESKTOP_NAV_HEIGHT, DesktopNav } from '@/ui/component/DesktopNav';
import { ProfileHeader } from './components/ProfileHeader';
import { BackTop, Tabs } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { SendTokenModal } from './components/SendTokenModal';
import { DesktopSelectAccountList } from '@/ui/component/DesktopSelectAccountList';
import { SwapTokenModal } from './components/SwapTokenModal';
import { TransactionsTabPane } from './components/TransactionsTabPane';
import { DesktopChainSelector } from '../DesktopChainSelector';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { findChainByEnum } from '@/utils/chain';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useDesktopBalanceView } from './hooks/useDesktopBalanceView';
import { useMemoizedFn } from 'ahooks';
import { SendNftModal } from './components/SendNftModal';
import { ReceiveTokenModal } from './components/ReceiveTokenModal';
import { SignatureRecordModal } from './components/SignatureRecordModal';
import { EVENTS, KEYRING_TYPE } from '@/constant';
import { useListenTxReload } from './hooks/useListenTxReload';
import { GnosisQueueModal } from './components/GnosisQueueModal';
import { ApprovalsTabPane } from './components/ApprovalsTabPane';
import { AddressDetailModal } from './components/AddressDetailModal';
import { AddressBackupModal } from './components/AddressBackupModal';
import { AddAddressModal } from './components/AddAddressModal';
import { RcIconBackTopCC } from '@/ui/assets/desktop/profile';
import { ReachedEnd } from './components/ReachedEnd';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import TopShortcut, {
  PORTFOLIO_LIST_ID,
  TOP_SHORTCUT_SLOT_ID,
} from './components/TokensTabPane/components/TopShortCut';
import { AbstractProject } from '@/ui/utils/portfolio/types';
import { NFTTabPane } from './components/NFTTabPane';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ga4 } from '@/utils/ga4';
import { DesktopPending } from './components/DesktopPending';
import { TokenTab } from './components/TokensTabPane/TokenTab';
import { DIFITab } from './components/TokensTabPane/DifiTab';
import { useTokenAndDIFIData } from './components/TokensTabPane/hook';
import { DesktopPageWrap } from '@/ui/component/DesktopPageWrap';
import { SwitchThemeBtn } from './components/SwitchThemeBtn';

const StickyBorderTop = () => (
  <div className="sticky h-0 z-50" style={{ top: DESKTOP_NAV_HEIGHT }}>
    <div
      className={clsx(
        'overflow-hidden absolute w-full h-[40px] pointer-events-none',
        'flex justify-between'
      )}
    >
      <div className="relative left-[-10px] w-20 h-20 bg-rb-neutral-bg-1" />
      <div className="relative right-[-10px] w-20 h-20 bg-rb-neutral-bg-1" />
      <div
        className={clsx(
          'absolute top-0 left-0 border border-b-0 border-solid border-rb-neutral-line bg-transparent ',
          'w-full',
          'h-[100px]  rounded-b-none ',
          'rounded-[20px]'
        )}
      />
    </div>
  </div>
);

export const DesktopProfile: React.FC<{
  isActive?: boolean;
  style?: React.CSSProperties;
}> = ({ isActive = true, style }) => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();

  const history = useHistory();
  const location = useLocation();
  const dispatch = useRabbyDispatch();
  const activeTab = useMemo(() => {
    const match = location.pathname.match(/^\/desktop\/profile(?:\/([^/?]+))?/);
    return match?.[1] || 'tokens';
  }, [location.pathname]);

  const handleTabChange = (key: string) => {
    dispatch.desktopProfile.setField({ activeTab: key });
    history.replace(`/desktop/profile/${key}`);
  };
  const { action, sendPageType } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      action: searchParams.get('action'),
      sendPageType: searchParams.get('sendPageType'),
    };
  }, [location.search]);
  const chain = useRabbySelector((store) => store.desktopProfile.chain);
  const chainInfo = useMemo(() => findChainByEnum(chain), [chain]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    balance,
    evmBalance,
    curveChartData,
    isBalanceLoading,
    isCurveLoading,
    appChainIds,
    refreshBalance,
    refreshCurve,
  } = useDesktopBalanceView({
    address: currentAccount?.address,
  });

  const isUpdating = isBalanceLoading || isCurveLoading;
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isUpdating) {
      // todo
      setUpdatedAt(Date.now());
    }
  }, [isUpdating]);

  const [cacheProjectOverviewList, setCacheProjectOverviewList] = useState<
    AbstractProject[]
  >([]);
  const [searchValue, setSearchValue] = React.useState('');

  const {
    // useQueryProjects
    isTokensLoading,
    isAllTokenLoading,
    isPortfoliosLoading,
    portfolios,
    tokenList,
    hasTokens,
    removeProtocol,
    portfolioNetWorth,
    // useQueryProjects end
    // useAppChain
    appPortfolios,
    appPortfolioNetWorth,
    isAppPortfoliosLoading,
    // useAppChain end
    currentPortfolioNetWorth,
    displayTokenList,
    displayPortfolios,
    sortTokens,
    lpTokenMode,
    setLpTokenMode,
    appIds,
    isNoResults,
    refreshPositions,
    refreshTokens,
  } = useTokenAndDIFIData({
    selectChainId: chainInfo?.serverId,
    allTokenMode: !!searchValue,
  });

  const handleUpdate = useMemoizedFn(async () => {
    setRefreshKey((prev) => prev + 1);
    refreshPositions();
    refreshBalance();
    refreshCurve();
  });

  useListenTxReload(async () => {
    refreshBalance();
    refreshCurve();
    refreshTokens();
  });

  useEffect(
    useMemoizedFn(() => {
      if (
        action === 'gnosis-queue' &&
        currentAccount?.type !== KEYRING_TYPE.GnosisKeyring
      ) {
        history.replace(history.location.pathname);
      }
      if (action === 'send' && sendPageType === 'sendNft') {
        history.replace(history.location.pathname);
      }
    }),
    [currentAccount?.type, currentAccount?.address]
  );

  useEventBusListener(EVENTS.DESKTOP.FOCUSED, () => {
    // window.location.reload();
    handleUpdate();
  });

  return (
    <>
      <DesktopPageWrap
        className="w-full h-full bg-rb-neutral-bg-1 js-scroll-element px-[20px] no-scrollbar"
        ref={scrollContainerRef}
        style={style}
      >
        <div className="main-content flex-1 pb-[20px]">
          <div className="layout-container">
            <DesktopNav />
            <div
              className="sticky z-10 pt-[0px] overflow-scroll flex-initial px-1 w-auto"
              style={{
                width: 0,
                scrollbarWidth: 'none',
                top: DESKTOP_NAV_HEIGHT + 57,
              }}
              id={TOP_SHORTCUT_SLOT_ID}
            >
              {cacheProjectOverviewList?.length > 0 && activeTab === 'difi' && (
                <TopShortcut projects={cacheProjectOverviewList || []} />
              )}
            </div>
            <StickyBorderTop />
            <div className="flex items-start gap-[20px]">
              <main className="flex-1" id={PORTFOLIO_LIST_ID}>
                <div
                  key={refreshKey}
                  className={clsx(
                    'border border-t-0 border-solid border-rb-neutral-line',
                    'rounded-[20px] rounded-t-none'
                  )}
                >
                  <ProfileHeader
                    balance={balance}
                    evmBalance={evmBalance}
                    curveChartData={curveChartData}
                    isLoading={isBalanceLoading || isCurveLoading}
                    onRefresh={handleUpdate}
                    appChainIds={appChainIds}
                  />
                  <Tabs
                    tabBarStyle={{
                      position: 'sticky',
                      top: DESKTOP_NAV_HEIGHT,
                    }}
                    className="overflow-visible"
                    defaultActiveKey={activeTab}
                    activeKey={activeTab}
                    onChange={handleTabChange}
                    tabBarExtraContent={{
                      right: (
                        <>
                          <div className="flex items-center gap-[16px] pr-[20px]">
                            <DesktopPending />
                            <DesktopChainSelector
                              value={chain}
                              onChange={(v) =>
                                dispatch.desktopProfile.setField({ chain: v })
                              }
                            />
                          </div>
                        </>
                      ),
                    }}
                  >
                    <Tabs.TabPane
                      tab={t('page.desktopProfile.tabs.tokens')}
                      key="tokens"
                    >
                      <TokenTab
                        searchValue={searchValue}
                        setSearchValue={setSearchValue}
                        isTokensLoading={
                          !!isTokensLoading ||
                          (!!lpTokenMode && !!isAllTokenLoading)
                        }
                        isNoResults={isNoResults}
                        sortTokens={sortTokens}
                        hasTokens={hasTokens}
                        lpTokenMode={lpTokenMode}
                        setLpTokenMode={setLpTokenMode}
                        selectChainId={chainInfo?.serverId}
                      />
                    </Tabs.TabPane>
                    <Tabs.TabPane
                      tab={t('page.desktopProfile.tabs.defi')}
                      key="difi"
                    >
                      <>
                        <DIFITab
                          onProjectOverviewListChange={
                            setCacheProjectOverviewList
                          }
                          appIds={appIds}
                          displayPortfolios={displayPortfolios}
                          currentPortfolioNetWorth={currentPortfolioNetWorth}
                          isLoading={
                            !!isTokensLoading ||
                            !!isPortfoliosLoading ||
                            !!isAppPortfoliosLoading
                          }
                          isNoResults={isNoResults}
                          removeProtocol={removeProtocol}
                        />
                      </>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="NFTs" key="nft">
                      <NFTTabPane selectChainId={chainInfo?.serverId} />
                    </Tabs.TabPane>
                    <Tabs.TabPane
                      tab={t('page.desktopProfile.tabs.transactions')}
                      key="transactions"
                    >
                      <TransactionsTabPane
                        selectChainId={chainInfo?.serverId}
                        scrollContainerRef={scrollContainerRef}
                      />
                    </Tabs.TabPane>
                    <Tabs.TabPane
                      tab={t('page.desktopProfile.tabs.approvals')}
                      key="approvals"
                    >
                      <ApprovalsTabPane
                        isDesktop={true}
                        desktopChain={chain}
                        key={`${currentAccount?.address}-${currentAccount?.type}`}
                      />
                    </Tabs.TabPane>
                  </Tabs>
                </div>
                <div className="flex justify-end px-[20px]">
                  <BackTop
                    target={() => scrollContainerRef.current || window}
                    style={{
                      bottom: 32,
                      zIndex: 100,
                      right: 'initial',
                    }}
                  >
                    <div
                      className={clsx(
                        'flex items-center justify-center w-[32px] h-[32px] rounded-full',
                        'bg-rb-neutral-bg-1 dark:bg-rb-neutral-bg-4',
                        'text-rb-neutral-foot'
                      )}
                      style={{
                        boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.12)',
                      }}
                    >
                      <RcIconBackTopCC />
                    </div>
                  </BackTop>
                </div>
              </main>
            </div>
          </div>
        </div>
        <aside
          className={clsx(
            'flex-shrink-0 sticky z-20 top-0 h-full flex flex-col'
          )}
          // style={{ top: DESKTOP_NAV_HEIGHT }}
        >
          <div
            className="flex items-center justify-end flex-shrink-0"
            style={{ height: `${DESKTOP_NAV_HEIGHT}px` }}
          >
            <SwitchThemeBtn />
          </div>
          <div className="flex-1">
            <DesktopSelectAccountList />
          </div>
        </aside>
      </DesktopPageWrap>
      <SendTokenModal
        visible={action === 'send'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
      />
      <SwapTokenModal
        visible={action === 'swap' || action === 'bridge'}
        action={action as 'swap' | 'bridge'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
      />
      {/* <NftTabModal
        visible={action === 'nft'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      /> */}
      <SendNftModal
        visible={action === 'send-nft'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
      <ReceiveTokenModal
        visible={action === 'receive'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
      <SignatureRecordModal
        visible={action === 'activities'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
      <GnosisQueueModal
        visible={action === 'gnosis-queue'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />

      <AddressDetailModal
        visible={action === 'address-detail'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
      <AddressBackupModal
        visible={action === 'address-backup'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
      <AddAddressModal
        visible={action === 'add-address'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
    </>
  );
};
