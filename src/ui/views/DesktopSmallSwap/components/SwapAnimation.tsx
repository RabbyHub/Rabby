import IconUnknown from '@/ui/assets/token-default.svg';
import { Chain } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Image } from 'antd';
import clsx from 'clsx';
import React from 'react';
import styles from './SwapAnimation.module.css';

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
    <div
      className={clsx(
        styles.container,
        'relative w-[80px] h-[24px]',
        className
      )}
    >
      <div className="flex items-center gap-[18px]">
        <div className="flex items-center gap-[12px]">
          <div className="relative w-[24px] h-[24px] shrink-0 from-token">
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
          <div className="relative w-[24px] h-[24px] shrink-0 to-token">
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
    </div>
  );
};
