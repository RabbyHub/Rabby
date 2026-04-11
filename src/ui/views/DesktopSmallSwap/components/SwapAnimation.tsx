import IconUnknown from '@/ui/assets/token-default.svg';
import { Chain } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Image } from 'antd';
import clsx from 'clsx';
import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  .from-token {
    animation: fromTokenFlow 900ms ease-out infinite;
  }

  .to-token {
    animation: toTokenFlow 900ms ease-out infinite;
  }

  .dot {
    animation: dotAnimation 900ms ease-out infinite;
    position: relative;
  }

  .dot-inner {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    &::after {
      content: ' ';
      display: block;
      animation: dotArrowFlow 900ms ease-out infinite;
      transform-origin: center;
      border-radius: 999px;
    }
  }

  @keyframes fromTokenFlow {
    0% {
      transform: scale(1);
      opacity: 1;
    }

    50% {
      transform: scale(0.95);
      opacity: 0.5;
    }

    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes toTokenFlow {
    0% {
      transform: scale(1);
    }

    50% {
      transform: scale(1.05);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes dotAnimation {
    0% {
      transform: scale(1);
    }

    50% {
      transform: scale(1.125);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes dotArrowFlow {
    0% {
      width: 4px;
      height: 1px;
      background: rgba(45, 45, 45, 0);
      transform: translateX(-15px);
    }

    50% {
      width: 8px;
      height: 8px;
      background: #4c65ff;
      transform: translateX(0);
    }

    100% {
      width: 4px;
      height: 1px;
      background: rgba(45, 45, 45, 0);
      transform: translateX(12px);
    }
  }
`;

type SwapAnimationProps = {
  className?: string;
  chain?: Chain | null;
  fromToken?: TokenItem | null;
  toToken?: TokenItem | null;
};

export const SwapAnimation: React.FC<SwapAnimationProps> = ({
  className,
  chain,
  fromToken,
  toToken,
}) => {
  return (
    <Container className={clsx('relative w-[80px] h-[24px]', className)}>
      <div className="flex items-center gap-[18px]">
        <div className="flex items-center gap-[12px]">
          <div className="relative w-[24px] h-[24px] flex-shrink-0 from-token">
            <Image
              className="w-full h-full block rounded-full"
              src={fromToken?.logo_url || IconUnknown}
              alt={fromToken?.symbol}
              fallback={IconUnknown}
              preview={false}
            />
            <img
              className="w-[9px] h-[9px] absolute right-[-1px] bottom-[-1px] rounded-full"
              src={chain?.logo || IconUnknown}
              alt={chain?.name}
            />
          </div>
          <div className="w-[9px] h-[9px] rounded-full bg-r-blue-default dot">
            <div className="dot-inner"></div>
          </div>
          <div className="relative w-[24px] h-[24px] flex-shrink-0 to-token">
            <Image
              className="w-full h-full block rounded-full"
              src={toToken?.logo_url || IconUnknown}
              alt={toToken?.symbol}
              fallback={IconUnknown}
              preview={false}
            />
            <img
              className="w-[9px] h-[9px] absolute right-[-1px] bottom-[-1px] rounded-full"
              src={chain?.logo || IconUnknown}
              alt={chain?.name}
            />
          </div>
        </div>
      </div>
    </Container>
  );
};
