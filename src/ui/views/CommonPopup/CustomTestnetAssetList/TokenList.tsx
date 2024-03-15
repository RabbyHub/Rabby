import React, { useEffect } from 'react';
import { Props as TokenItemProps } from './TokenItem';
import { useExpandList } from '@/ui/utils/portfolio/expandList';
import BigNumber from 'bignumber.js';
import { TokenTable } from './components/TokenTable';
import { BlockedButton } from './BlockedButton';
import { CustomizedButton } from './CustomizedButton';
import { TokenListEmpty } from './TokenListEmpty';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/ui/utils';

export interface Props {
  list?: TokenItemProps['item'][];
  isSearch: boolean;
  onFocusInput: () => void;
  isNoResults?: boolean;
  blockedTokens?: TokenItemProps['item'][];
  customizeTokens?: TokenItemProps['item'][];
  isTestnet: boolean;
}

export const TokenList: React.FC<Props> = ({
  list,
  onFocusInput,
  isSearch,
  isNoResults,
  blockedTokens,
  customizeTokens,
  isTestnet,
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

  const hasList = !!(
    list?.length ||
    blockedTokens?.length ||
    customizeTokens?.length
  );

  return (
    <div>
      <div>
        <TokenTable list={list} EmptyComponent={<div></div>} />
      </div>
    </div>
  );
};
