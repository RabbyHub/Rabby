import React, { useState } from 'react';
import {
  TokenListSkeleton,
  TokenListViewSkeleton,
} from '@/ui/views/CommonPopup/AssetList/TokenListViewSkeleton';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import { useSwitchNetTab } from '@/ui/component/PillsSwitch/NetSwitchTabs';
import { BigNumber } from 'bignumber.js';
import useSearchToken from '@/ui/hooks/useSearchToken';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import useDebounceValue from '@/ui/hooks/useDebounceValue';
import { Input } from 'antd';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import MainnetTestnetSwitchTabs from './components/switchTestTab';
import IconSearch from 'ui/assets/search.svg';
import { TokenList } from './TokenList';
import { useRabbyDispatch } from '@/ui/store';
import { LpTokenSwitch } from './components/LpTokenSwitch';

interface Props {
  isTokensLoading: boolean;
  isNoResults: boolean;
  sortTokens: AbstractPortfolioToken[];
  hasTokens: boolean;
  lpTokenMode: boolean;
  setLpTokenMode?: (value: boolean) => void;
  selectChainId?: string;
}

export const TokenTab = ({
  sortTokens,
  isTokensLoading,
  isNoResults,
  hasTokens,
  selectChainId,
  lpTokenMode,
  setLpTokenMode,
}: Props) => {
  const { t } = useTranslation();
  const currentAccount = useCurrentAccount();

  const [inputActive, setIsInputActive] = useState(false);
  const handleInputFocus = () => {
    setIsInputActive(true);
  };

  const handleInputBlur = () => {
    setIsInputActive(false);
  };

  const { selectedTab, onTabChange } = useSwitchNetTab();

  const [searchValue, setSearchValue] = React.useState('');

  const debouncedSearchValue = useDebounceValue(searchValue, 300);

  const { isLoading: isSearching, list: searchTokenList } = useSearchToken(
    currentAccount?.address,
    debouncedSearchValue,
    {
      chainServerId: selectChainId ? selectChainId : undefined,
      withBalance: true,
      isTestnet: selectedTab === 'testnet',
    }
  );

  const searchList = selectChainId
    ? (searchTokenList || []).filter((e) => e.chain === selectChainId)
    : searchTokenList || [];

  const isOnSearching = isSearching || searchValue !== debouncedSearchValue;

  const tokenListTotalValue = React.useMemo(() => {
    return sortTokens
      ?.reduce((acc, item) => acc.plus(item._usdValue || 0), new BigNumber(0))
      .toNumber();
  }, [sortTokens]);

  if (isTokensLoading && !hasTokens) {
    return (
      <div className="mx-20">
        <TokenListViewSkeleton />
      </div>
    );
  }
  return (
    <>
      <div
        className={clsx(
          'flex items-center justify-between py-[14px] px-[20px]',
          'bg-rb-neutral-bg-1',
          'sticky z-10'
        )}
        style={{ top: 103 + 57 }}
      >
        <div className="flex items-center gap-[16px]">
          <Input
            prefix={<img src={IconSearch} />}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className={clsx(
              { active: inputActive },
              'w-[345px] h-[40px]',
              'px-12 text-rb-neutral-title-1 text-[14px]',
              'bg-rb-neutral-card-1',
              'border   rounded-[12px]',
              inputActive ? 'border-rb-brand-default' : 'border-rb-neutral-line'
            )}
            placeholder={t('page.dashboard.assets.table.searchToken')}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            allowClear
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        </div>
        <div className="flex items-center gap-[16px]">
          {selectedTab === 'mainnet' && (
            <LpTokenSwitch
              lpTokenMode={lpTokenMode}
              onLpTokenModeChange={setLpTokenMode}
            />
          )}
          <MainnetTestnetSwitchTabs
            value={selectedTab}
            onTabChange={onTabChange}
          />
        </div>
      </div>

      {isTokensLoading || isOnSearching ? (
        <div className="mx-20">
          <TokenListSkeleton />
        </div>
      ) : (
        <TokenList
          list={sortTokens}
          isNoResults={isNoResults}
          totalValue={tokenListTotalValue}
          selectedTab={selectedTab}
          searchList={searchList}
          isSearch={!!searchValue}
        />
      )}
    </>
  );
};
