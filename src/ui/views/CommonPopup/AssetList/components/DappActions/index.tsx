import { WithdrawAction } from '@rabby-wallet/rabby-api/dist/types';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { useDappAction } from './hook';

const Wrapper = styled.div`
  display: flex;
  gap: 12px;
  padding-left: 12px;
  padding-right: 12px;
`;

interface ActionButtonProps {
  className?: string;
  text: string;
  onClick: () => void;
}
const ActionButton = ({ text, onClick, className }: ActionButtonProps) => {
  return (
    <div
      className={`
        cursor-pointer text-r-blue-default font-medium text-[13px] text-center
        h-[36px] leading-[34px]
        border border-r-blue-default rounded-[6px]
        hover:bg-r-blue-light1
        ${className}
      `}
      onClick={onClick}
    >
      {text}
    </div>
  );
};
const DappActions = ({
  data,
  chain,
}: {
  data?: WithdrawAction[];
  chain?: string;
}) => {
  console.log('CUSTOM_LOGGER:=>: data', data, chain);
  const withdrawActions = data?.filter(
    (item) => !item?.need_approve?.to && item.type === 'withdraw'
  );
  const claimActions = data?.filter(
    (item) => !item?.need_approve?.to && item.type === 'claim'
  );
  const { valid: validWithdraw, action: actionWithdraw } = useDappAction(
    withdrawActions?.[0],
    chain
  );
  const { valid: validClaim, action: actionClaim } = useDappAction(
    claimActions?.[0],
    chain
  );

  const { showWithdraw, showClaim } = useMemo(() => {
    const hasWithdraw = data?.some((item) => item.type === 'withdraw');
    const hasClaim = data?.some((item) => item.type === 'claim');
    return {
      showWithdraw: hasWithdraw && validWithdraw,
      showClaim: hasClaim && validClaim,
    };
  }, [data, validWithdraw, validClaim]);

  return (
    <Wrapper>
      {showWithdraw && (
        <ActionButton
          text="Withdraw"
          className={`${showClaim ? 'w-[216px]' : ''}`}
          onClick={actionWithdraw}
        />
      )}
      {showClaim && (
        <ActionButton
          text="Claim"
          className={`${showWithdraw ? 'w-[108px]' : ''}`}
          onClick={actionClaim}
        />
      )}
    </Wrapper>
  );
};

export default DappActions;
