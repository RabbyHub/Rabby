import React from 'react';
import { TokenButton } from './components/TokenButton';
import { useRabbySelector } from '@/ui/store';
import useSortToken from '@/ui/hooks/useSortTokens';

interface Props {
  onClickLink: () => void;
  isTestnet: boolean;
}

export const CustomizedButton: React.FC<Props> = ({
  onClickLink,
  isTestnet,
}) => {
  const { customize } = useRabbySelector((store) =>
    isTestnet ? store.account.testnetTokens : store.account.tokens
  );
  const list = useSortToken(customize);

  return (
    <TokenButton
      label="customized"
      linkText="Search address to add custom token"
      description="Custom token added by you will be shown here"
      tokens={list}
      onClickLink={onClickLink}
    />
  );
};
