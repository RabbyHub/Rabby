import { ConnectedSite } from '@/background/service/permission';
import { CHAINS } from '@/constant';
import { FallbackSiteLogo } from '@/ui/component';
import clsx from 'clsx';
import React, { forwardRef, memo } from 'react';
import { ReactComponent as IconStar } from 'ui/assets/star-1.svg';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ConnectionItemProps {
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
        ...rest
      }: ConnectionItemProps & Record<string, any>,
      ref: React.ForwardedRef<any>
    ) => {
      return (
        <div className="item" ref={ref} onClick={onClick} {...rest}>
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
  const { item, sort } = props;
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
      className={clsx('item', isDragging && 'is-dragging')}
      ref={setNodeRef}
      {...attributes}
      style={style}
      {...listeners}
      {...props}
    ></Item>
  );
});
