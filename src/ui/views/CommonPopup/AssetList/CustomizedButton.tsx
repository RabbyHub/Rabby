import React from 'react';
import { TokenButton } from './components/TokenButton';
import { useRabbySelector } from '@/ui/store';
import useSortToken from '@/ui/hooks/useSortTokens';

interface Props {
  onClickLink: () => void;
}

export const CustomizedButton: React.FC<Props> = ({ onClickLink }) => {
  const { customize } = useRabbySelector((store) => store.account.tokens);
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
