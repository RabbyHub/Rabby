import { Account } from '@/background/service/preference';
import { RcIconArrowRightCC } from '@/ui/assets/dashboard';
import { DesktopAccountSelector } from '@/ui/component/DesktopAccountSelector';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useRabbyDispatch } from '@/ui/store';
import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import IconRabby from 'ui/assets/rabby.svg';

import { db } from '@/db';
import { findChain } from '@/utils/chain';
import { useLiveQuery } from 'dexie-react-hooks';
import { sortBy } from 'lodash';
import { ChainPillList } from './components/ChainPillList';
import { LowValueTokenSelector } from './components/LowValueTokenSelector';
import { ReceiveSummary } from './components/ReceiveSummary';

export const DesktopSmallSwap: React.FC<{
  isActive?: boolean;
  style?: React.CSSProperties;
}> = ({ isActive = true, style }) => {
  const dispatch = useRabbyDispatch();
  const currentAccount = useCurrentAccount();

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

  if (chainList?.length && !chainServerId) {
    setChainServerId(chainList[0].id);
  }

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
  }, [currentAccount?.address, chainServerId]);

  return (
    <div
      className={clsx(
        'h-full overflow-auto bg-r-neutral-bg-2',
        !isActive && 'hidden'
      )}
      style={style}
    >
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
          />
        </header>

        <ChainPillList
          data={chainList}
          value={chainServerId}
          onChange={setChainServerId}
        />

        <div className="flex items-stretch justify-between gap-[24px]">
          <LowValueTokenSelector chain={chain} tokenList={tokenList || []} />

          <div className="w-[64px] flex items-center justify-center flex-shrink-0">
            <button
              type="button"
              className="w-[48px] h-[48px] rounded-full border border-rabby-neutral-line bg-r-neutral-card-1 flex items-center justify-center text-r-neutral-foot hover:text-r-blue-default hover:border-r-blue-default"
              style={{ boxShadow: '0 12px 24px rgba(25, 41, 69, 0.08)' }}
            >
              <RcIconArrowRightCC className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* <ReceiveSummary totalValue={totalValue} formatUsd={formatUsd} /> */}
        </div>
      </div>
    </div>
  );
};
