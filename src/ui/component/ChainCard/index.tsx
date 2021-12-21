import React from 'react';
import { useHover } from 'ui/utils';
import clsx from 'clsx';
import { Chain } from 'background/service/chain';
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
}: {
  plus: boolean;
  showIcon: boolean;
  chain: Chain;
  saveToPin?(chain: string): void;
  removeFromPin?(chain: string): void;
  width?: number;
  height?: number;
  className?: string;
}) => {
  const [isHovering, hoverProps] = useHover();
  const save = () => {
    saveToPin && saveToPin(chain.enum);
  };
  const remove = () => {
    removeFromPin && removeFromPin(chain.enum);
  };
  return (
    <div
      className={clsx(
        'chain-card',
        isHovering && 'hover',
        !plus && 'pinned',
        className
      )}
      {...hoverProps}
    >
      <img src={chain?.logo} className="chain-logo" />
      <p className="chain-name">{chain?.name}</p>
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
