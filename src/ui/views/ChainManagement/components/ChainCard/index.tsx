import React, { useState, useEffect, memo, useCallback } from 'react';
import { useWallet, useHover } from 'ui/utils';
import clsx from 'clsx';
import { Chain } from 'background/service/chain';
import './style.less';
import { CHAINS, CHAINS_ENUM } from 'consts';
import IconAddChain from 'ui/assets/addchain.png';
import IconChainDelete from 'ui/assets/chain-delete.png';
const ChainCard = ({
  chain,
  plus = true,
  saveToPin,
  removeFromPin,
}: {
  plus: boolean;
  chain: Chain;
  saveToPin?(chain: string): void;
  removeFromPin?(chain: string): void;
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
        'w-[164px] h-[52px]',
        'chain-card',
        isHovering && 'hover',
        !plus && 'pinned'
      )}
      {...hoverProps}
    >
      <img src={chain?.logo} className="chain-logo" />
      <p className="chain-name">{chain?.name}</p>
      <img
        src={plus ? IconAddChain : IconChainDelete}
        className="chain-add"
        onClick={plus ? save : remove}
      />
    </div>
  );
};

export default ChainCard;
