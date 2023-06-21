import React from 'react';
import { TokenButton } from './components/TokenButton';
import { useCustomizedToken } from './useCustomizedToken';

interface Props {
  onClickLink: () => void;
}

export const CustomizedButton: React.FC<Props> = ({ onClickLink }) => {
  const { tokens } = useCustomizedToken();

  return (
    <TokenButton
      label="customized"
      linkText="Search address to add custom token"
      description="Custom token added by you will be shown here"
      tokens={tokens}
      onClickLink={onClickLink}
    />
  );
};
