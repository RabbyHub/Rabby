import { ConnectedSite } from '@/background/service/permission';
import { CHAINS } from '@/constant';
import { FallbackSiteLogo } from '@/ui/component';
import clsx from 'clsx';
import React, { forwardRef, memo, useMemo } from 'react';
import IconPinned from 'ui/assets/icon-pinned.svg';
import IconPinnedFill from 'ui/assets/icon-pinned-fill.svg';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import IconDisconnect from 'ui/assets/icon-disconnect.svg';
import { findChainByEnum } from '@/utils/chain';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

interface ConnectionItemProps {
  className?: string;
  item: ConnectedSite;
  onClick?(): void;
  onFavoriteChange?(value: boolean): void;
  onRemove?(origin: string): void;
}

export const Item = memo(
  forwardRef(
    (
      {
        item,
        onClick,
        onFavoriteChange,
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
          <img
            className="icon-close"
            src={IconDisconnect}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onRemove) {
                onRemove(item.origin);
              }
            }}
          />
          <div className="logo cursor-pointer">
            <FallbackSiteLogo
              url={item.icon}
              origin={item.origin}
              width="28px"
              style={{
                borderRadius: '4px',
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
              onFavoriteChange && onFavoriteChange(!item.isTop);
            }}
          >
            <img
              src={item.isTop ? IconPinnedFill : IconPinned}
              className={clsx('pin-website', item.isTop && 'is-active')}
              alt=""
            />
          </div>
        </div>
      );
    }
  )
);

export const ConnectionItem = memo((props: ConnectionItemProps) => {
  const { item, className } = props;
  const {
    attributes,
    setNodeRef,
    transform,
    transition,
    listeners,
    isDragging,
  } = useSortable({
    id: item.origin,
  });
  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? 'none' : transition,
    }),
    [transform, transition, isDragging]
  );
  return (
    <Item
      className={clsx(className, isDragging && 'is-dragging')}
      ref={setNodeRef}
      {...attributes}
      style={style}
      {...listeners}
      {...props}
    ></Item>
  );
});
