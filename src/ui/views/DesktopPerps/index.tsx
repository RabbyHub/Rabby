import React, { useMemo } from 'react';
import styled from 'styled-components';
import { TopNavBar } from './components/TopNavBar';
import { ChartArea } from './components/ChartArea';
import { OrderBookTrades } from './components/OrderBookTrades';
import { TradingPanel } from './components/TradingPanel';
import { UserInfoHistory } from './components/UserInfoHistory';
import { AccountInfo } from './components/AccountInfo';
import { StatusBar } from './components/StatusBar';
import './index.less';
import { DesktopPerpsSelectAccountList } from '@/ui/component/DesktopSelectAccountList/PerpsAccountList';
import clsx from 'clsx';
import { usePerpsProInit } from './hooks/usePerpsProInit';
import { AddAddressModal } from '../DesktopProfile/components/AddAddressModal';
import { useHistory, useLocation } from 'react-router-dom';
import { DepositWithdrawModal } from './components/DepositWithdrawModal';

const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
  background: var(--rb-neutral-bg-1, #fff);
  display: flex;
  flex-direction: column;
  padding-bottom: 32px;
`;

export const DesktopPerps: React.FC = () => {
  usePerpsProInit();

  const history = useHistory();
  const location = useLocation();
  const { action } = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      action: searchParams.get('action'),
    };
  }, [location.search]);

  return (
    <>
      <Wrap>
        <TopNavBar />

        <div className="flex flex-1 pl-16 pr-8 pb-16">
          <div className="flex flex-col flex-1 min-w-0 border border-solid border-rb-neutral-line rounded-[16px] overflow-hidden bg-rb-neutral-bg-1">
            <div className="flex h-[670px] border-b border-solid border-rb-neutral-line">
              <div className="flex flex-[4] min-w-0 border-r border-solid border-rb-neutral-line">
                {/* ChartArea - 75% */}
                <div className="flex-[3] min-w-0 border-r border-solid border-rb-neutral-line">
                  <ChartArea />
                </div>
                {/* OrderBookTrades - 25% */}
                <div className="flex-1 min-w-0">
                  <OrderBookTrades />
                </div>
              </div>

              {/* Right: TradingPanel */}
              <div className="w-[400px] flex-shrink-0">
                <TradingPanel />
              </div>
            </div>

            {/* Bottom Row: UserInfoHistory + AccountInfo */}
            <div className="flex flex-1 min-h-[300px] max-h-[400px]">
              {/* UserInfoHistory */}
              <div className="flex-[4] min-w-0 border-r border-solid border-rb-neutral-line overflow-hidden">
                <UserInfoHistory />
              </div>
              {/* AccountInfo */}
              <div className="w-[400px] flex-shrink-0 overflow-auto">
                <AccountInfo />
              </div>
            </div>
          </div>

          <aside
            className={clsx(
              'min-w-[64px] flex-shrink-0 z-20 h-full overflow-auto pl-[16px]'
            )}
          >
            <DesktopPerpsSelectAccountList />
          </aside>
        </div>

        <StatusBar />
      </Wrap>
      <AddAddressModal
        visible={action === 'add-address'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />

      <DepositWithdrawModal
        visible={action === 'deposit' || action === 'withdraw'}
        type={action === 'deposit' ? 'deposit' : 'withdraw'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
      />
      {/* <DepositWithdrawModal
        visible={action === 'withdraw'}
        type="withdraw"
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
      /> */}
    </>
  );
};
