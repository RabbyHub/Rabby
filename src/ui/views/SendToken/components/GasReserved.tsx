import React from 'react';
import styled from 'styled-components';

import { TokenItem } from 'background/service/openapi';
import { formatTokenAmount } from '@/ui/utils/number';
import { getTokenSymbol } from '@/ui/utils/token';
import { Trans, useTranslation } from 'react-i18next';

const GasReservedDiv = styled.div`
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  text-align: right;
  color: var(--r-neutral-foot, #6a7587);
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;

const TokenAmount = styled.span`
  cursor: pointer;
  color: var(--r-blue-default, #7084ff);
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
  const { t } = useTranslation();

  return (
    <GasReservedDiv>
      <Trans
        i18nKey="page.sendTokenComponents.GasReserved"
        values={{
          tokenName: getTokenSymbol(token),
        }}
        t={t}
      >
        Reserved
        <TokenAmount title={amount} onClick={onClickAmount}>
          {formatTokenAmount(amount, 4)}
        </TokenAmount>
        {getTokenSymbol(token)} for gas cost
      </Trans>
    </GasReservedDiv>
  );
};

export default GasReserved;
