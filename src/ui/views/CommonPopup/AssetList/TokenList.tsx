import React from 'react';
import { Props as TokenItemProps } from './TokenItem';
import { useExpandList } from '@/ui/utils/portfolio/expandList';
import BigNumber from 'bignumber.js';
import { TokenLowValueItem } from './TokenLowValueItem';
import { TokenTable } from './components/TokenTable';
import { BlockedButton } from './BlockedButton';
import { CustomizedButton } from './CustomizedButton';
import { TokenListEmpty } from './TokenListEmpty';
import { useTranslation } from 'react-i18next';

export interface Props {
  list?: TokenItemProps['item'][];
  isSearch: boolean;
  onFocusInput: () => void;
  onOpenAddEntryPopup: () => void;
  isNoResults?: boolean;
  blockedTokens?: TokenItemProps['item'][];
  customizeTokens?: TokenItemProps['item'][];
  isTestnet: boolean;
  selectChainId?: string | null;
  lpTokenMode?: boolean;
}

export const HomeTokenList = ({
  list,
  onFocusInput,
  onOpenAddEntryPopup,
  isSearch,
  isNoResults,
  blockedTokens,
  customizeTokens,
  isTestnet,
  selectChainId,
  lpTokenMode,
}) => {
  const totalValue = React.useMemo(() => {
    return list
      ?.reduce(
        (acc, item) => acc.plus(item.is_core ? item._usdValue || 0 : 0),
        new BigNumber(0)
      )
      .toNumber();
  }, [list]);
  const { result: currentList } = useExpandList(list, totalValue);
  const lowValueList = React.useMemo(() => {
    // 排除customized tokens
    const customizedTokenIds = new Set(
      customizeTokens?.map((token) => token.id) || []
    );
    return list?.filter(
      (item) =>
        currentList?.indexOf(item) === -1 &&
        !customizedTokenIds.has(item.id) &&
        !blockedTokens?.some(
          (blocked) => blocked.id === item.id && blocked.chain === item.chain
        )
    );
  }, [currentList, list, isSearch, customizeTokens]);
  const { t } = useTranslation();

  if (isNoResults) {
    return (
      <TokenListEmpty
        className="mt-[92px]"
        text={t('page.dashboard.assets.table.noMatch')}
      />
    );
  }
  if (lpTokenMode && !list?.length) {
    return (
      <div className="no-token w-full flex flex-col items-center justify-center h-[154px] bg-r-neutral-card1 rounded-[8px]">
        <img
          className="w-[72px] h-[72px]"
          src="/images/nodata-tx.png"
          alt="no site"
        />
        <p className="text-r-neutral-foot text-13 mt-2 text-center mb-0">
          {t('component.TokenSelector.noLpTokens')}
        </p>
      </div>
    );
  }

  const hasList = !!(
    list?.length ||
    currentList?.length ||
    blockedTokens?.length ||
    customizeTokens?.length
  );
  const hasLowValueList = !!lowValueList?.length;

  return (
    <div>
      <div>
        <TokenTable
          list={isSearch ? list : currentList}
          EmptyComponent={<div></div>}
        />
        {!isSearch && hasList && hasLowValueList && (
          <TokenLowValueItem list={lowValueList} className="h-[48px]" />
        )}
      </div>
      {/* {!isSearch && hasList && (
        <div className="flex gap-12 pt-12 mt-[1px]">
          <CustomizedButton
            onClickButton={onOpenAddEntryPopup}
            isTestnet={isTestnet}
            selectChainId={selectChainId}
          />
          <BlockedButton
            onClickLink={onFocusInput}
            isTestnet={isTestnet}
            selectChainId={selectChainId}
          />
        </div>
      )} */}
    </div>
  );
};
