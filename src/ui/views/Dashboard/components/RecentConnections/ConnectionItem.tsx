import { ConnectedSite } from '@/background/service/permission';
import { FallbackSiteLogo } from '@/ui/component';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { findChainByEnum } from '@/utils/chain';
import clsx from 'clsx';
import React, { forwardRef, memo } from 'react';
import { ReactComponent as RcIconDisconnect } from 'ui/assets/icon-disconnect.svg';
import { ReactComponent as RcIconPinned } from 'ui/assets/icon-pinned.svg';
import { ReactComponent as RcIconPinnedFill } from 'ui/assets/icon-pinned-fill.svg';

interface ConnectionItemProps {
  className?: string;
  item: ConnectedSite;
  onClick?(): void;
  onRemove?(origin: string): void;
  onPin?(item: ConnectedSite): void;
}

export const Item = memo(
  forwardRef(
    (
      {
        item,
        onClick,
        onRemove,
        onPin,
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
          <div className="flex items-center gap-[4px] min-w-0">
            <div className="item-content flex-1 truncate">{item.origin}</div>
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPin?.(item);
              }}
            >
              <ThemeIcon
                src={item.isTop ? RcIconPinnedFill : RcIconPinned}
                className={clsx('pin-website', item.isTop && 'is-active')}
              />
            </div>
          </div>
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
