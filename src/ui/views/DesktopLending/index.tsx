import React, { useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { useRabbyDispatch } from '@/ui/store';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { LendingList } from './components/LendingList';
import { SummaryBar } from './components/SummaryBar';
import { LendingProvider } from './hooks/useLendingService';
import { LendingDataProvider } from './hooks/LendingDataContext';
import {
  useFetchLendingData,
  useLendingSummaryCard,
  useSelectedMarket,
} from './hooks';
import './index.less';
import { useHistory, useLocation } from 'react-router-dom';
import { SignatureRecordModal } from '../DesktopProfile/components/SignatureRecordModal';
import { useLendingService } from './hooks/useLendingService';
import { CustomMarket } from './config/market';

const Wrap = styled.div`
  width: 100%;
  min-height: 100vh;
  background: var(--rb-neutral-bg-1, #fff);
  display: flex;
  flex-direction: column;
  padding-bottom: 88px;
`;

const DesktopLendingContent: React.FC = () => {
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();
  const { fetchData, setFetchLoading } = useFetchLendingData();
  const { iUserSummary, apyInfo } = useLendingSummaryCard();
  const { marketKey } = useSelectedMarket();

  useEffect(() => {
    setFetchLoading(true);
    fetchData();
    // TODO: 有循环，待排查
  }, [marketKey]);

  return (
    <>
      <Wrap>
        <div className="flex flex-1 pl-16 pr-8 pb-16">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <DesktopNav showRightItems={false} />
              <div className="flex items-center gap-[16px]">
                <DesktopAccountSelector
                  value={currentAccount}
                  onChange={(account) => {
                    dispatch.account.changeAccountAsync(account);
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col flex-1 min-w-0 border border-solid border-rb-neutral-line rounded-[16px] overflow-hidden bg-rb-neutral-bg-1 mt-[16px] relative">
              <div className="flex-1 min-h-[300px] overflow-hidden">
                <LendingList />
              </div>
              <div className="flex-shrink-0">
                <SummaryBar
                  netWorth={iUserSummary?.netWorthUSD || ''}
                  supplied={iUserSummary?.totalLiquidityUSD || ''}
                  borrowed={iUserSummary?.totalBorrowsUSD || ''}
                  netApy={apyInfo?.netAPY || 0}
                  healthFactor={iUserSummary?.healthFactor || ''}
                />
              </div>
            </div>
          </div>
        </div>
      </Wrap>
    </>
  );
};

const DesktopLendingWithRoute: React.FC = () => {
  const { setLastSelectedChain } = useLendingService();
  const location = useLocation();

  const syncMarketFromQuery = useCallback(() => {
    const searchParams = new URLSearchParams(location.search);
    const marketKey = searchParams.get('marketKey') as CustomMarket | null;
    if (marketKey) {
      setLastSelectedChain(marketKey);
    }
  }, [location.search, setLastSelectedChain]);

  useEffect(() => {
    syncMarketFromQuery();
  }, [syncMarketFromQuery]);

  return <DesktopLendingContent />;
};

export const DesktopLending: React.FC<{
  isActive?: boolean;
}> = ({ isActive = true }) => {
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
      <LendingProvider>
        <LendingDataProvider>
          <DesktopLendingWithRoute />
        </LendingDataProvider>
      </LendingProvider>
      <SignatureRecordModal
        visible={action === 'activities'}
        onCancel={() => {
          history.replace(history.location.pathname);
        }}
        destroyOnClose
      />
    </>
  );
};
