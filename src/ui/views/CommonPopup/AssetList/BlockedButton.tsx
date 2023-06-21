import React from 'react';
import { TokenButton } from './components/TokenButton';

interface Props {
  onClickLink: () => void;
}

export const BlockedButton: React.FC<Props> = ({ onClickLink }) => {
  return (
    <TokenButton
      label="blocked"
      linkText="Search address to block token"
      description="Token blocked by you will be shown here"
      onClickLink={onClickLink}
    />
  );
};
