import { Account } from '@/background/service/preference';
// import { RcIconArrowRightCC } from '@/ui/assets/dashboard';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import { ReactComponent as RcIconArrowRightCC } from 'ui/assets/arrow-right-1-cc.svg';
import IconRabby from 'ui/assets/rabby.svg';

import { DEX } from '@/constant';
import { db } from '@/db';
import { useWallet } from '@/ui/utils';
import { findChain } from '@/utils/chain';
import { DEX_ENUM } from '@rabby-wallet/rabby-swap';
import { useEventListener, useMemoizedFn, useRequest } from 'ahooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { sortBy } from 'lodash';
import { useQuoteMethods } from '../Swap/hooks/quote';
import { ChainPillList } from './components/ChainPillList';
import { LowValueTokenSelector } from './components/LowValueTokenSelector';
import { ReceiveSummary } from './components/ReceiveSummary';
import { StopTaskModal } from './components/StopTaskModal';
import {
  DEFAULT_ETH_MAX_GAS_COST,
  DEFAULT_MAX_GAS_COST,
  DEFAULT_SLIPPAGE,
} from './constant';
import { useBatchSwapTask } from './hooks/useBatchSwapTask';
import { SwapAnimation } from './components/SwapAnimation';

const DesktopSmallSwapContent: React.FC = () => {
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();

  const [chainServerId, setChainServerId] = useState('');

  const handleAccountChange = (account: Account) => {
    dispatch.account.changeAccountAsync(account);
  };

  const chainList = useLiveQuery(() => {
    return db.balance
      .where('address')
      .equalsIgnoreCase(currentAccount?.address || '')
      .first()
      .then((data) => {
        return sortBy(data?.chain_list || [], (item) => -(item.usd_value || 0));
      });
  }, [currentAccount?.address]);

  const handleChainChange = useMemoizedFn((serverId: string) => {
    if (chainServerId !== serverId) {
      if (serverId === 'eth') {
        task.setConfig({
          slippage: DEFAULT_SLIPPAGE,
          maxGasCost: DEFAULT_ETH_MAX_GAS_COST,
        });
      } else {
        task.setConfig({
          slippage: DEFAULT_SLIPPAGE,
          maxGasCost: DEFAULT_MAX_GAS_COST,
        });
      }
      task.clear();
    }
    setChainServerId(serverId);
  });

  const chain = useMemo(() => {
    console.log('chainList', chainList, chainServerId);
    return findChain({
      serverId: chainServerId,
    });
  }, [chainList, chainServerId]);

  const tokenList = useLiveQuery(() => {
    if (!currentAccount?.address || !chainServerId) {
      return [];
    }
    return db.token
      .where('[owner_addr+chain]')
      .equals([currentAccount?.address?.toLowerCase() || '', chainServerId])
      .toArray();
  }, [currentAccount?.address, chainServerId, chain?.nativeTokenAddress]);

  const { data: receiveToken } = useRequest(
    async () => {
      if (!chain) {
        return null;
      }
      return wallet.openapi.getToken(
        currentAccount?.address || '',
        chain.serverId,
        chain.nativeTokenAddress
      );
    },
    {
      refreshDeps: [chain, currentAccount?.address],
    }
  );

  console.log('receiveToken', receiveToken);

  const task = useBatchSwapTask({
    chain: chain || undefined,
    account: currentAccount || undefined,
    receiveToken: receiveToken || undefined,
  });

  useEffect(() => {
    if (chainList?.length && !chainServerId) {
      handleChainChange(chainList[0].id);
    }
  }, [chainList?.length]);

  useEventListener('blur', () => {
    if (task.status === 'active') {
      task.pause();
    }
  });

  useEventListener('beforeunload', (e) => {
    if (task.status === 'active') {
      task.pause();
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });

  return (
    <div className={clsx('h-full overflow-auto bg-r-neutral-bg-2')}>
      <div className="max-w-[1248px] min-w-[1200px] mx-auto px-[24px] pt-[32px] pb-[40px] min-h-full">
        <header className="flex items-start justify-between gap-[24px] mb-[32px]">
          <div className="min-w-0">
            <div className="flex items-center gap-[16px]">
              <img src={IconRabby} alt="Rabby" />
              <div className="space-y-[8px]">
                <div className="text-[24px] leading-[29px] font-semibold text-r-neutral-title1">
                  Dust converter
                </div>
                <div className="text-[15px] leading-[18px] text-r-neutral-foot">
                  Clear out low-value tokens on the blockchain to make your
                  asset list simpler!
                </div>
              </div>
            </div>
          </div>

          <DesktopAccountSelector
            value={currentAccount}
            onChange={handleAccountChange}
            scene="smallSwap"
            className="bg-r-neutral-card-1"
          />
        </header>

        <ChainPillList
          data={chainList}
          value={chainServerId}
          disabled={task.status !== 'idle'}
          onChange={handleChainChange}
        />

        <div className="flex items-stretch justify-between gap-[24px]">
          <LowValueTokenSelector
            key={chain?.serverId}
            chain={chain}
            tokenList={tokenList || []}
            task={task}
            disabled={task.status !== 'idle'}
          />

          <div className="flex-shrink-0 flex items-center">
            <div
              className="w-[64px] h-[64px] rounded-full border border-rabby-neutral-line bg-r-neutral-card-1 flex items-center justify-center text-r-neutral-foot"
              style={{ boxShadow: '0 12px 24px rgba(25, 41, 69, 0.08)' }}
            >
              <RcIconArrowRightCC className="w-[26px] h-[26px]" />
            </div>
          </div>

          <ReceiveSummary
            token={receiveToken}
            chain={chain}
            task={task}
            receiveToken={receiveToken}
            account={currentAccount}
          />
        </div>
      </div>

      <StopTaskModal
        visible={task.status === 'paused'}
        onContinue={task.continue}
        onStop={task.clear}
      />
    </div>
  );
};

export const DesktopSmallSwap: React.FC = () => {
  const currentAccount = useCurrentAccount();
  return (
    <DesktopSmallSwapContent
      key={`${currentAccount?.type}-${currentAccount?.address}`}
    />
  );
};
