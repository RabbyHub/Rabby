import { ConnectedSite } from '@/background/service/permission';
import { FallbackSiteLogo } from '@/ui/component';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChainByEnum } from '@/utils/chain';
import clsx from 'clsx';
import React, { forwardRef, memo } from 'react';
import { ReactComponent as RcIconDisconnect } from 'ui/assets/icon-disconnect.svg';

interface ConnectionItemProps {
  className?: string;
  item: ConnectedSite;
  onClick?(): void;
  onRemove?(origin: string): void;
}

export const Item = memo(
  forwardRef(
    (
      {
        item,
        onClick,
        onRemove,
        className,
        ...rest
      }: ConnectionItemProps & Record<string, any>,
      ref: React.ForwardedRef<any>
    ) => {
      const chainItem = findChainByEnum(item.chain);
      return (
        <div
          className={clsx('item', className)}
          ref={ref}
          onClick={onClick}
          {...rest}
        >
          <div className="logo cursor-pointer">
            <FallbackSiteLogo
              url={item.icon}
              origin={item.origin}
              width="24px"
              style={{
                borderRadius: '50%',
              }}
            />
            <TooltipWithMagnetArrow
              title={chainItem?.name}
              className="rectangle w-[max-content]"
            >
              <img
                className="connect-chain"
                src={chainItem?.logo}
                alt={chainItem?.name}
              />
            </TooltipWithMagnetArrow>
          </div>
          <span className="item-content">{item.origin}</span>
          <div
            className="item-extra"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onRemove) {
                onRemove(item.origin);
              }
            }}
          >
            <ThemeIcon
              className="icon-close"
              src={RcIconDisconnect}
              viewBox="0 0 16 16"
            />
          </div>
        </div>
      );
    }
  )
);
