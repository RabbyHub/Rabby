import React from 'react';
import styled from 'styled-components';

import { TokenItem } from 'background/service/openapi';
import LessPalette from '@/ui/style/var-defs';
import { formatTokenAmount } from '@/ui/utils/number';
import { getTokenSymbol } from '@/ui/utils/token';

const GasReservedDiv = styled.div`
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  text-align: right;
  color: #707280;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const TokenAmount = styled.span`
  cursor: pointer;
  color: ${LessPalette['@primary-color']};
  text-decoration: underline;
  font-weight: 500;
  margin: 0 2px;
`;

interface GasReservedProps {
  amount: string;
  token: TokenItem;
  onClickAmount(): void;
}

const GasReserved = ({ amount, token, onClickAmount }: GasReservedProps) => {
  return (
    <GasReservedDiv>
      Reserved{' '}
      <TokenAmount title={amount} onClick={onClickAmount}>
        {formatTokenAmount(amount, 4)}
      </TokenAmount>
      {getTokenSymbol(token)} for gas cost
    </GasReservedDiv>
  );
};

export default GasReserved;
