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
import { TokenList } from './TokenList';
import styled from 'styled-components';
import { ReactComponent as SearchSVG } from '@/ui/assets/search.svg';

interface Props {
  isTokensLoading: boolean;
  isNoResults: boolean;
  sortTokens: AbstractPortfolioToken[];
  hasTokens: boolean;
  selectChainId?: string;
}

const StyledInput = styled(Input)`
  .ant-input {
    background: transparent;
    color: var(--rb-neutral-title-1, #192945);
  }
`;

export const TokenTab = ({
  sortTokens,
  isTokensLoading,
  isNoResults,
  hasTokens,
  selectChainId,
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

  const { selectedTab, onTabChange, isShowTestnet } = useSwitchNetTab();

  const [searchValue, setSearchValue] = React.useState('');

  const isMainnet = selectedTab === 'mainnet';

  const debouncedSearchValue = useDebounceValue(searchValue, 300);

  const { isLoading: isSearching, list: searchTokenList } = useSearchToken(
    currentAccount?.address,
    debouncedSearchValue,
    selectChainId ? selectChainId : undefined,
    true,
    selectedTab === 'testnet'
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

  if (isMainnet && isTokensLoading && !hasTokens) {
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
        <div className="flex items-center gap-[16px] widget-has-ant-input">
          <StyledInput
            prefix={<SearchSVG className="w-[14px] h-[14px]" />}
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
        {isShowTestnet && (
          <MainnetTestnetSwitchTabs
            value={selectedTab}
            onTabChange={onTabChange}
          />
        )}
      </div>

      {isTokensLoading || isOnSearching ? (
        isMainnet ? (
          <div className="mx-20">
            <TokenListSkeleton />
          </div>
        ) : null
      ) : (
        <TokenList
          list={sortTokens}
          isNoResults={isNoResults}
          totalValue={tokenListTotalValue}
          selectedTab={selectedTab}
          searchList={searchList}
          isSearch={!!searchValue}
          search={searchValue}
        />
      )}
    </>
  );
};
