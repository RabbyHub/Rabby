import React from 'react';
import { TokenButton } from './components/TokenButton';
import { useRabbySelector } from '@/ui/store';
import useSortToken from '@/ui/hooks/useSortTokens';

interface Props {
  onClickLink: () => void;
  isTestnet: boolean;
}

export const BlockedButton: React.FC<Props> = ({ onClickLink, isTestnet }) => {
  const { blocked } = useRabbySelector((store) =>
    isTestnet ? store.account.testnetTokens : store.account.tokens
  );
  const list = useSortToken(blocked);

  return (
    <TokenButton
      label="blocked"
      tokens={list}
      linkText="Search address to block token"
      description="Token blocked by you will be shown here"
      onClickLink={onClickLink}
      hiddenSubTitle
    />
  );
};
