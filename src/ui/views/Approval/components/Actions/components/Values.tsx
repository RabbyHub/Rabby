import React from 'react';
import styled from 'styled-components';
import { formatAmount } from 'ui/utils/number';

const Boolean = ({ value }: { value: boolean }) => {
  return <>{value ? 'Yes' : 'No'}</>;
};

const TokenAmountWrapper = styled.div`
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const TokenAmount = ({ value }: { value: string | number }) => {
  return <TokenAmountWrapper>{formatAmount(value)}</TokenAmountWrapper>;
};

const Percentage = ({ value }: { value: number }) => {
  return <>{Math.floor(value * 100)}%</>;
};

export { Boolean, TokenAmount, Percentage };
