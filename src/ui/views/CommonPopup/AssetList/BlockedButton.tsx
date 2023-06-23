import React from 'react';
import { TokenButton } from './components/TokenButton';
import { useRabbySelector } from '@/ui/store';

interface Props {
  onClickLink: () => void;
}

export const BlockedButton: React.FC<Props> = ({ onClickLink }) => {
  const { blocked } = useRabbySelector((store) => store.account.tokens);

  return (
    <TokenButton
      label="blocked"
      tokens={blocked}
      linkText="Search address to block token"
      description="Token blocked by you will be shown here"
      onClickLink={onClickLink}
    />
  );
};
