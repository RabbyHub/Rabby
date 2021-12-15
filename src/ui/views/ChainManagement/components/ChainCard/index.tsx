import React, { useState, useEffect, memo, useCallback } from 'react';
import { useWallet, useHover } from 'ui/utils';
import clsx from 'clsx';
import { Chain } from 'background/service/chain';
import './style.less';
import { CHAINS, CHAINS_ENUM } from 'consts';

const ChainCard = ({ chain }) => {
  const [isHovering, hoverProps] = useHover();

  return (
    <div
      className={clsx(
        'w-[164px] h-[52px]',
        'chain-card',
        isHovering && 'hover'
      )}
      {...hoverProps}
    >
      <img src={chain?.logo} className="chain-logo" />
      <p className="chain-name">{chain?.name}</p>
    </div>
  );
};

export default ChainCard;
