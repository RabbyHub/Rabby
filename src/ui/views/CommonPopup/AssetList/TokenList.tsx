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
}) => {
  const totalValue = React.useMemo(() => {
    return list
      ?.reduce((acc, item) => acc.plus(item._usdValue || 0), new BigNumber(0))
      .toNumber();
  }, [list]);
  const { result: currentList } = useExpandList(list, totalValue);
  const lowValueList = React.useMemo(() => {
    return list?.filter((item) => currentList?.indexOf(item) === -1);
  }, [currentList, list, isSearch]);
  const { t } = useTranslation();

  if (isNoResults) {
    return (
      <TokenListEmpty
        className="mt-[92px]"
        text={t('page.dashboard.assets.table.noMatch')}
      />
    );
  }

  const hasList = !!(
    list?.length ||
    currentList?.length ||
    blockedTokens?.length ||
    customizeTokens?.length
  );

  return (
    <div>
      <div>
        <TokenTable
          list={isSearch ? list : currentList}
          EmptyComponent={<div></div>}
        />
        {!isSearch && hasList && (
          <TokenLowValueItem list={lowValueList} className="h-[40px]" />
        )}
      </div>
      {!isSearch && hasList && (
        <div className="flex gap-12 pt-12 border-t-[0.5px] border-rabby-neutral-line">
          <CustomizedButton
            onClickButton={onOpenAddEntryPopup}
            isTestnet={isTestnet}
          />
          <BlockedButton onClickLink={onFocusInput} isTestnet={isTestnet} />
        </div>
      )}
    </div>
  );
};
