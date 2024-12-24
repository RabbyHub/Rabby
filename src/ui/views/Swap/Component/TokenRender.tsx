import { TokenWithChain } from '@/ui/component';
import React from 'react';
import styled from 'styled-components';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { getTokenSymbol } from '@/ui/utils/token';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcImgArrowDown } from '@/ui/assets/swap/arrow-down.svg';

const TokenRenderWrapper = styled.div`
  width: auto;
  height: 40px;
  background: var(--r-neutral-card2, #f2f4f7);
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 8px 12px;
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
    gap: 6px;
    align-items: center;

    .text {
      color: var(--r-neutral-title-1, #f7fafc);
      max-width: 68px;
      display: inline-block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  .select {
    color: var(--r-neutral-title-1, #f7fafc);
    flex: 1;
    gap: 6px;
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
  type = 'swap',
}: {
  token?: TokenItem | undefined;
  openTokenModal: () => void;
  type?: 'swap' | 'bridge';
}) => {
  const { t } = useTranslation();

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
          <span className="text" title={getTokenSymbol(token)}>
            {getTokenSymbol(token)}
          </span>
          <RcImgArrowDown
            viewBox="0 0 16 16"
            className="arrow text-r-neutral-foot w-16 h-16"
          />
        </div>
      ) : (
        <div className="select">
          <span>{t('page.swap.select-token')}</span>
          <RcImgArrowDown
            viewBox="0 0 16 16"
            className="arrow text-r-neutral-foot w-16 h-16"
          />
        </div>
      )}
    </TokenRenderWrapper>
  );
};
