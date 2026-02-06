import React, { useEffect, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import styled from 'styled-components';
import { useSceneAccount } from '@/ui/hooks/backgroundState/useAccount';
import { DesktopNav } from '@/ui/component/DesktopNav';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { LendingList } from './components/LendingList';
import { SummaryBar } from './components/SummaryBar';
import { LendingProvider } from './hooks/useLendingService';
import { LendingDataProvider } from './hooks/LendingDataContext';
import { useFetchLendingData, useLendingSummaryCard } from './hooks';
import { useListenTxReload } from '../DesktopProfile/hooks/useListenTxReload';
import './index.less';
import { useHistory, useLocation } from 'react-router-dom';
import { SignatureRecordModal } from '../DesktopProfile/components/SignatureRecordModal';
import { useLendingService } from './hooks/useLendingService';
import { CustomMarket } from './config/market';
import { useSelectedMarket } from './hooks/market';
import { SwitchThemeBtn } from '../DesktopProfile/components/SwitchThemeBtn';

const Wrap = styled.div`
  width: 100%;
  height: 100vh;
  background: var(--rb-neutral-bg-1, #fff);
  padding: 0 20px 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const DesktopLendingContent: React.FC = () => {
  const [currentAccount, switchCurrentSceneAccount] = useSceneAccount({
    scene: 'lending',
  });
  const { fetchData, setFetchLoading } = useFetchLendingData();
  const { iUserSummary, apyInfo } = useLendingSummaryCard();
  const { marketKey } = useSelectedMarket();

  useEffect(() => {
    setFetchLoading(true);
    console.log(
      'CUSTOM_LOGGER:=>: fetchData',
      marketKey,
      currentAccount?.address
    );
    fetchData();
  }, [marketKey, currentAccount?.address]);

  useListenTxReload(fetchData);

  return (
    <Wrap>
      <div className="flex items-center justify-between">
        <DesktopNav showRightItems={false} />
        <div className="flex items-center gap-[16px]">
          <DesktopAccountSelector
            value={currentAccount}
            onChange={(account) => {
              switchCurrentSceneAccount(account);
            }}
          />
          <SwitchThemeBtn />
        </div>
      </div>
      <div
        className={clsx(
          'flex flex-col flex-1 min-h-0 min-w-0 mt-[4px] relative',
          'border border-solid border-rb-neutral-line rounded-[20px] overflow-hidden',
          'bg-rb-neutral-bg-1'
        )}
      >
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">
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
    </Wrap>
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
