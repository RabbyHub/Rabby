import { ConnectedSite } from '@/background/service/permission';
import { CHAINS } from '@/constant';
import { FallbackSiteLogo } from '@/ui/component';
import clsx from 'clsx';
import React, { forwardRef, memo } from 'react';
import { ReactComponent as IconStar } from 'ui/assets/star-1.svg';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ConnectionItemProps {
  className?: string;
  item: ConnectedSite;
  sort?: boolean;
  onClick?(): void;
  onFavoriteChange?(value: boolean): void;
}

export const Item = memo(
  forwardRef(
    (
      {
        item,
        onClick,
        onFavoriteChange,
        className,
        ...rest
      }: ConnectionItemProps & Record<string, any>,
      ref: React.ForwardedRef<any>
    ) => {
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
              width="28px"
              style={{
                borderRadius: '4px',
              }}
            />
            <img
              className="connect-chain"
              src={CHAINS[item.chain]?.logo}
              alt={CHAINS[item.chain]?.name}
            />
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
            <IconStar
              className={clsx('pin-website', { 'is-active': item.isTop })}
            />
          </div>
        </div>
      );
    }
  )
);

export const ConnectionItem = memo((props: ConnectionItemProps) => {
  const { item, sort, className } = props;
  const {
    attributes,
    setNodeRef,
    transform,
    transition,
    listeners,
    isDragging,
  } = useSortable({
    id: item.origin,
    disabled: !sort,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  };
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
