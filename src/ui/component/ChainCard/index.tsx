import React from 'react';
import { useHover } from 'ui/utils';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Chain } from 'background/service/openapi';
import './style.less';
import IconAddChain from 'ui/assets/addchain.png';
import IconChainDelete from 'ui/assets/chain-delete.png';

const ChainCard = ({
  chain,
  plus = true,
  showIcon = true,
  saveToPin,
  removeFromPin,
  className,
  onClick,
}: {
  plus: boolean;
  showIcon: boolean;
  chain?: Chain;
  saveToPin?(chain: string): void;
  removeFromPin?(chain: string): void;
  className?: string;
  onClick?(): void;
}) => {
  const [isHovering, hoverProps] = useHover();

  const {
    attributes,
    setNodeRef,
    transform,
    transition,
    listeners,
  } = useSortable({
    id: chain?.id + '',
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const save = () => {
    saveToPin && saveToPin(chain?.enum || '');
  };

  const remove = () => {
    removeFromPin && removeFromPin(chain?.enum || '');
  };

  return (
    <div
      className={clsx(
        'chain-card-wrapper',
        isHovering && 'hover',
        !plus && 'pinned',
        className
      )}
      {...hoverProps}
      ref={setNodeRef}
      {...attributes}
      style={style}
      onClick={onClick}
    >
      {!plus ? (
        <div className={clsx('chain-card', 'cursor-pointer')} {...listeners}>
          <img src={chain?.logo} className="chain-logo" />
          <p className="chain-name">{chain?.name}</p>
        </div>
      ) : (
        <div className={clsx('chain-card', 'cursor-pointer')} onClick={save}>
          <img src={chain?.logo} className="chain-logo" />
          <p className="chain-name">{chain?.name}</p>
        </div>
      )}
      {showIcon && (
        <img
          src={plus ? IconAddChain : IconChainDelete}
          className="chain-add"
          onClick={plus ? save : remove}
        />
      )}
    </div>
  );
};

export default ChainCard;
