import React, { useMemo, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { ChartArea } from './components/ChartArea';
import { OrderBookTrades } from './components/OrderBookTrades';
import { TradingPanel } from './components/TradingPanel';
import { UserInfoHistory } from './components/UserInfoHistory';
import { AccountInfo } from './components/AccountInfo';
import { StatusBar } from './components/StatusBar';
import './index.less';
import { usePerpsProInit } from './hooks/usePerpsProInit';
import { useHistory, useLocation } from 'react-router-dom';
import {
  DepositWithdrawModal,
  DepositWithdrawModalType,
} from './components/DepositWithdrawModal';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { AccountActions } from './components/AccountActions';
import { TopPermissionTips } from './components/TopPermissionTips';
import { SwitchThemeBtn } from '../DesktopProfile/components/SwitchThemeBtn';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import usePerpsProState from './hooks/usePerpsProState';

const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
  background: var(--rb-neutral-bg-1, #fff);
  display: flex;
  flex-direction: column;
  padding-bottom: 32px;
`;

export type PopupType = DepositWithdrawModalType | 'add-address' | null;

export const DesktopPerps: React.FC<{ isActive?: boolean }> = ({
  isActive = true,
}) => {
  usePerpsProInit();

  const history = useHistory();
  const location = useLocation();
  const dispatch = useRabbyDispatch();
  const selectedCoin = useRabbySelector((state) => state.perps.selectedCoin);
  const isUpdatingFromUrl = useRef(false);

  const currentPerpsAccount = useRabbySelector(
    (s) => s.perps.currentPerpsAccount
  );
  const { login: switchPerpsAccount } = usePerpsProState();

  const { action, coin } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      action: searchParams.get('action'),
      coin: searchParams.get('coin'),
    };
  }, [location.search]);

  // Initialize coin from URL on mount or when URL coin changes
  useEffect(() => {
    if (!isActive) {
      return;
    }
    if (coin && coin !== selectedCoin) {
      isUpdatingFromUrl.current = true;
      dispatch.perps.setSelectedCoin(coin);
      // Reset flag after state update
      setTimeout(() => {
        isUpdatingFromUrl.current = false;
      }, 0);
    }
  }, [coin, dispatch, isActive]); // Run when URL coin param changes

  // Update URL when selectedCoin changes (but not from URL change)
  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (!isUpdatingFromUrl.current && selectedCoin && coin !== selectedCoin) {
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('coin', selectedCoin);
      history.replace({
        pathname: location.pathname,
        search: searchParams.toString(),
      });
    }
  }, [selectedCoin, coin, history, location, isActive]);

  return (
    <>
      <Wrap>
        <div className="flex flex-1 px-[20px] pb-16">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <DesktopNav showRightItems={false} />

              <div className="flex items-center gap-[16px]">
                <DesktopAccountSelector
                  scene="perps"
                  value={currentPerpsAccount}
                  onChange={switchPerpsAccount}
                />
                <AccountActions />
                <SwitchThemeBtn />
              </div>
            </div>
            <TopPermissionTips />
            <div className="flex flex-col flex-1 min-w-0 border border-solid border-rb-neutral-line rounded-[16px] overflow-hidden bg-rb-neutral-bg-1">
              <div className="flex h-[680px] border-b border-solid border-rb-neutral-line">
                <div className="flex-[4] flex min-w-0 border-r border-solid border-rb-neutral-line overflow-hidden">
                  <div className="flex-[3] min-w-0 border-r border-solid border-rb-neutral-line">
                    <ChartArea />
                  </div>
                  <div className="flex-1 min-w-0">
                    <OrderBookTrades />
                  </div>
                </div>
                <div className=" flex-1 flex-shrink-0 overflow-auto">
                  <TradingPanel />
                </div>
              </div>

              <div className="flex flex-1 min-h-[280px] max-h-[max(280px,calc(100vh-820px))]">
                <div className="flex-[4] min-w-0 border-r border-solid border-rb-neutral-line overflow-hidden">
                  <UserInfoHistory />
                </div>
                <div className="flex-1 flex-shrink-0 overflow-auto">
                  <AccountInfo />
                </div>
              </div>
            </div>
          </div>
        </div>

        <StatusBar />
      </Wrap>
      {/* <AddAddressModal
        visible={action === 'add-address'}
        onCancel={() => {
          setPopupType(null);
        }}
        destroyOnClose
      /> */}

      <DepositWithdrawModal
        visible={action === 'deposit' || action === 'withdraw'}
        type={action === 'deposit' ? 'deposit' : 'withdraw'}
        onCancel={() => {
          const searchParams = new URLSearchParams(location.search);
          searchParams.delete('action');
          history.push({
            pathname: location.pathname,
            search: searchParams.toString(),
          });
        }}
      />
    </>
  );
};
