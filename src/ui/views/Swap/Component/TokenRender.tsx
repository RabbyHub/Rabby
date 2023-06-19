import { TokenWithChain } from '@/ui/component';
import React from 'react';
import styled from 'styled-components';
import { ReactComponent as IconRcArrowDownTriangle } from '@/ui/assets/swap/arrow-caret-down.svg';
import { TokenItem } from '@debank/rabby-api/dist/types';
const TokenRenderWrapper = styled.div`
  width: 150px;
  height: 46px;
  background: #f5f6fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 12px;
  font-weight: 500;
  font-size: 18px;
  color: #13141a;
  border: 1px solid transparent;
  cursor: pointer;
  &:hover {
    background: rgba(134, 151, 255, 0.2);
  }
  .token {
    display: flex;
    flex: 1;
    gap: 8px;
    align-items: center;

    .text {
      max-width: 68px;
      display: inline-block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  .select {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    white-space: nowrap;
  }
  .arrow {
    margin-left: auto;
    font-size: 12px;
    opacity: 0.8;
    width: 18px;
    height: 18px;
  }
`;
export const TokenRender = ({
  openTokenModal,
  token,
}: {
  token?: TokenItem | undefined;
  openTokenModal: () => void;
}) => {
  return (
    <TokenRenderWrapper onClick={openTokenModal}>
      {token ? (
        <div className="token">
          <TokenWithChain
            width="24px"
            height="24px"
            token={token}
            hideConer
            hideChainIcon
          />
          <span className="text" title={token.symbol}>
            {token.symbol}
          </span>
          <IconRcArrowDownTriangle viewBox="0 0 24 24" className="arrow" />
        </div>
      ) : (
        <div className="select">
          <span>Select Token</span>
          <IconRcArrowDownTriangle viewBox="0 0 24 24" className="arrow" />
        </div>
      )}
    </TokenRenderWrapper>
  );
};
