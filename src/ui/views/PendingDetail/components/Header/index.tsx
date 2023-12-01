import React, { ReactNode, useEffect, useMemo } from 'react';
import styled from 'styled-components';

import { TransactionGroup } from '@/background/service/transactionHistory';
import IconBg from '@/ui/assets/pending/header-bg.png';
import { TxRequest } from '@rabby-wallet/rabby-api/dist/types';
import { Predict } from './Predict';
import { TxHash } from './TxHash';
import { TxStatus } from './TxStatus';

const Wrapper = styled.div`
  position: relative;
  min-height: 420px;
  &:after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    height: 420px;
    background: url(${IconBg}) no-repeat center / cover;
  }
`;

export const Header = ({
  data,
  children,
  tx,
  onReBroadcast,
  isPending,
  loading,
}: {
  data?: TxRequest;
  tx?: TransactionGroup | null;
  children?: ReactNode;
  onReBroadcast?(): void;
  isPending?: boolean;
  loading?: boolean;
}) => {
  const key = useMemo(() => {
    return Math.random();
  }, [data]);

  return (
    <Wrapper>
      <div className="layout-container relative z-10">
        <div className="flex leading-[24px] py-[19px] min-h-[74px] items-center">
          <div className="mr-auto">
            {tx && (
              <TxStatus
                txRequest={data}
                tx={tx}
                onReBroadcast={onReBroadcast}
              />
            )}
          </div>
          <div>{tx ? <TxHash tx={tx} /> : null}</div>
        </div>
        <Predict
          data={data}
          isPending={isPending}
          key={key}
          loading={loading}
        />
        {children}
      </div>
    </Wrapper>
  );
};
