import React from 'react';
import { useTranslation } from 'react-i18next';
import { Props as TokenItemProps } from './CustomTestnetTokenItem';
import { TokenListEmpty } from '../TokenListEmpty';
import { CustomTestnetTokenTable } from '../components/CustomTestnetTokenTable';

export interface Props {
  list?: TokenItemProps['item'][];
  isSearch: boolean;
  onFocusInput: () => void;
  isNoResults?: boolean;
  onAdd?: (item: TokenItemProps['item']) => void;
  onRemove?: (item: TokenItemProps['item']) => void;
}

export const CustomTestnetTokenList: React.FC<Props> = ({
  list,
  isNoResults,
  onRemove,
  onAdd,
}) => {
  const { t } = useTranslation();

  if (isNoResults) {
    return (
      <TokenListEmpty
        className="mt-[92px]"
        text={t('page.dashboard.assets.table.noMatch')}
      />
    );
  }

  return (
    <CustomTestnetTokenTable
      list={list}
      EmptyComponent={<div></div>}
      onAdd={onAdd}
      onRemove={onRemove}
    />
  );
};
