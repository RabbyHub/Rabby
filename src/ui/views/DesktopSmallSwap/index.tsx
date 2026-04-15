import { Account } from '@/background/service/preference';
// import { RcIconArrowRightCC } from '@/ui/assets/dashboard';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyDispatch } from '@/ui/store';
import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import { ReactComponent as RcIconArrowRightCC } from 'ui/assets/arrow-right-1-cc.svg';
import IconRabby from 'ui/assets/rabby.svg';
import { SWAP_SUPPORT_CHAINS } from '@/constant';
import { db } from '@/db';
import { useWallet } from '@/ui/utils';
import { useTokens } from '@/ui/utils/portfolio/token';
import { abstractTokenToTokenItem } from '@/ui/utils/token';
import { isSupportDBAccount } from '@/utils/account';
import { findChain } from '@/utils/chain';
import { useEventListener, useMemoizedFn, useRequest } from 'ahooks';
import { useLiveQuery } from 'dexie-react-hooks';
import { sortBy } from 'lodash';
import { useTranslation } from 'react-i18next';
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

const DesktopSmallSwapContent: React.FC = () => {
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();
  const wallet = useWallet();
  const { t } = useTranslation();

  const [chainServerId, setChainServerId] = useState('');

  const handleAccountChange = (account: Account) => {
    dispatch.account.changeAccountAsync(account);
  };

  const { runAsync: fetchChainList } = useRequest(
    async (force?: boolean) => {
      if (!currentAccount) {
        return [];
      }

      const data = await wallet.getInMemoryAddressBalance(
        currentAccount.address,
        force
      );
      return sortBy(
        data?.chain_list || [],
        (item) => -(item.usd_value || 0)
      ).filter((item) => !!item.usd_value);
    },
    {
      manual: true,
      cacheKey: `DesktopSmallSwap_chainList-${currentAccount?.address}`,
      staleTime: 5 * 1000,
    }
  );

  useEffect(() => {
    fetchChainList();
  }, [currentAccount?.address, fetchChainList]);

  const chainList = useLiveQuery(() => {
    return db.balance
      .where('address')
      .equalsIgnoreCase(currentAccount?.address || '')
      .first()
      .then((data) => {
        return sortBy(
          data?.chain_list || [],
          (item) => -(item.usd_value || 0)
        ).filter((item) => {
          const chainEnum = findChain({ serverId: item.id })?.enum;
          return (
            chainEnum &&
            SWAP_SUPPORT_CHAINS.includes(chainEnum) &&
            !!item.usd_value
          );
        });
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
    return findChain({
      serverId: chainServerId,
    });
  }, [chainList, chainServerId]);

  const {
    tokens: allTokens,
    isLoading: isLoadingAllTokens,
    updateData: updateAllTokens,
  } = useTokens(
    chainServerId ? currentAccount?.address : undefined,
    true,
    undefined,
    chainServerId,
    undefined,
    undefined,
    false,
    false,
    true
  );

  const isSupportDB = isSupportDBAccount(currentAccount);

  const _tokenList = useMemo(() => {
    if (isSupportDB) {
      return [];
    }
    if (!chain) {
      return [];
    }
    return allTokens
      .map((token) => abstractTokenToTokenItem(token))
      .filter((token) => token.chain === chain.serverId);
  }, [chain, allTokens, isSupportDB]);

  const dbTokenList = useLiveQuery(() => {
    if (!currentAccount || !isSupportDB || !chainServerId) {
      return [];
    }
    return db.token
      .where('[owner_addr+chain]')
      .equals([currentAccount?.address?.toLowerCase() || '', chainServerId])
      .toArray()
      .then((tokens) => {
        return tokens.filter(
          (token) => token.id !== (chain?.nativeTokenAddress || chainServerId)
        );
      });
  }, [currentAccount?.address, chainServerId, chain?.nativeTokenAddress]);

  const tokenList = useMemo(() => {
    if (isSupportDB) {
      return dbTokenList || [];
    }
    return _tokenList;
  }, [isSupportDB, dbTokenList, _tokenList]);

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
      cacheKey: `DesktopSmallSwap_receiveToken-${currentAccount?.address}-${chain?.serverId}`,
      staleTime: 5 * 1000,
    }
  );

  const task = useBatchSwapTask({
    chain: chain || undefined,
    account: currentAccount || undefined,
    receiveToken: receiveToken || undefined,
  });

  const handleRefresh = useMemoizedFn(() => {
    updateAllTokens();
    fetchChainList(true);
  });

  useEffect(() => {
    if (chainList?.length && !chainServerId) {
      handleChainChange(chainList[0].id);
    }
  }, [chainList?.length]);

  useEventListener('visibilitychange', () => {
    if (document.hidden && task.status === 'active') {
      task.pause();
    }
  });

  useEventListener('beforeunload', (e) => {
    if (task.status === 'active') {
      e.preventDefault();
      e.returnValue = '';
      return '';
    }
  });

  useEffect(() => {
    if (task.status === 'completed') {
      handleRefresh();
    }
  }, [task.status]);

  return (
    <div className={clsx('h-full overflow-auto bg-r-neutral-bg-2')}>
      <div className="max-w-[1248px] min-w-[1200px] mx-auto px-[24px] pt-[32px] pb-[40px] h-full flex flex-col">
        <header className="flex items-end justify-between gap-[24px] mb-[32px] flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-[16px]">
              <img src={IconRabby} alt="Rabby" />
              <div className="space-y-[8px]">
                <div className="text-[24px] leading-[29px] font-semibold text-r-neutral-title1">
                  {t('page.desktopSmallSwap.title')}
                </div>
                <div className="text-[15px] leading-[18px] text-r-neutral-foot">
                  {t('page.desktopSmallSwap.description')}
                </div>
              </div>
            </div>
          </div>

          <DesktopAccountSelector
            value={currentAccount}
            onChange={handleAccountChange}
            scene="smallSwap"
            className="bg-r-neutral-card-1 h-[38px] rounded-[16px]"
            disabled={task.disabled}
          />
        </header>

        <div className="flex-shrink-0">
          <ChainPillList
            data={chainList}
            value={chainServerId}
            disabled={task.disabled}
            onChange={handleChainChange}
          />
        </div>

        <div className="flex-1 min-h-[608px] flex items-stretch justify-between gap-[24px]">
          <LowValueTokenSelector
            key={chain?.serverId}
            chain={chain}
            tokenList={tokenList || []}
            task={task}
            disabled={task.disabled}
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
        onStop={() => {
          task.stop();
        }}
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
