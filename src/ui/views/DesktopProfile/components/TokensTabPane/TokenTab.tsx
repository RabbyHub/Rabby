import React from 'react';
import { useRabbyDispatch } from '@/ui/store';
import {
  TokenListSkeleton,
  TokenListViewSkeleton,
} from '@/ui/views/CommonPopup/AssetList/TokenListViewSkeleton';
import { TokenList } from './TokenList';
import { AbstractPortfolioToken } from '@/ui/utils/portfolio/types';
import { useSwitchNetTab } from '@/ui/component/PillsSwitch/NetSwitchTabs';
import { BigNumber } from 'bignumber.js';

interface Props {
  isTokensLoading: boolean;
  isNoResults: boolean;
  sortTokens: AbstractPortfolioToken[];
  hasTokens: boolean;
  allMode: boolean;
}

export const TokenTab = ({
  allMode,
  sortTokens,
  isTokensLoading,
  isNoResults,
  hasTokens,
}: Props) => {
  const dispatch = useRabbyDispatch();

  const setAllMode = (value: boolean) => {
    dispatch.preference.setDesktopTokensAllMode(value);
  };

  const { selectedTab, onTabChange } = useSwitchNetTab();

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
      {isTokensLoading ? (
        <div className="mx-20">
          <TokenListSkeleton />
        </div>
      ) : (
        <TokenList
          allMode={allMode}
          onAllModeChange={setAllMode}
          list={sortTokens}
          isNoResults={isNoResults}
          totalValue={tokenListTotalValue}
          selectedTab={selectedTab}
          onTabChange={onTabChange}
        />
      )}
    </>
  );
};
