import { Tooltip } from 'antd';
import { CHAINS_ENUM, CHAINS } from '@debank/common';
import clsx from 'clsx';
import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { useWallet } from '@/ui/utils';

const ChainIconWrapper = styled.div`
  position: relative;
`;

const ChainIconEle = styled.img`
  border-radius: 100%;
  width: 32px;
  height: 32px;
  overflow: hidden;
  &.small {
    width: 20px;
    height: 20px;
  }
`;

const AvaliableIcon = styled.div`
  position: absolute;
  right: -2px;
  top: -2px;
  width: 10px;
  height: 10px;
  border: 1px solid #ffffff;
  background: #27c193;
  border-radius: 100%;
  overflow: hidden;
  &.small {
    width: 8px;
    height: 8px;
  }
`;

const UnavaliableIcon = styled.div`
  position: absolute;
  right: -2px;
  top: -2px;
  width: 10px;
  height: 10px;
  border: 1px solid #ffffff;
  background: #ec5151;
  border-radius: 100%;
  overflow: hidden;
  &.small {
    width: 8px;
    height: 8px;
  }
`;

const TooltipContent = styled.div`
  display: flex;
  align-items: center;
  max-width: 280px;
  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
  .alert-icon {
    width: 6px;
    height: 6px;
    border-radius: 100%;
    margin-right: 5px;
  }
  &.avaliable {
    color: #27c193;
    .alert-icon {
      background-color: #27c193;
    }
  }
  &.unavaliable {
    color: #ec5151;
    .alert-icon {
      background-color: #ec5151;
    }
  }
`;

interface Props {
  chain: CHAINS_ENUM;
  customRPC: string | undefined;
  size?: 'normal' | 'small';
  showCustomRPCToolTip?: boolean;
  nonce?: number;
}

const CustomRPCTooltipContent = ({
  rpc,
  avaliable,
}: {
  rpc: string;
  avaliable: boolean;
}) => {
  return (
    <TooltipContent className={clsx({ avaliable, unavaliable: !avaliable })}>
      <div className="alert-icon" />
      <span>
        RPC {avaliable ? 'avaliable' : 'unavailable'}: {rpc}
      </span>
    </TooltipContent>
  );
};

const ChainIcon = ({
  chain,
  customRPC,
  size = 'normal',
  showCustomRPCToolTip = false,
  nonce,
}: Props) => {
  const wallet = useWallet();
  const [customRPCAvaliable, setCustomRPCAvaliable] = useState(true);
  const [customRPCVlidated, setCustomRPCValidated] = useState(false);
  const chainRef = useRef(chain);
  const rpcRef = useRef(customRPC);

  const pingCustomRPC = async (c: CHAINS_ENUM, rpc: string | undefined) => {
    setCustomRPCValidated(false);
    if (rpc) {
      try {
        await wallet.pingCustomRPC(rpc);
        if (c !== chainRef.current || rpc !== rpcRef.current) return;
        setCustomRPCValidated(true);
        setCustomRPCAvaliable(true);
      } catch (e) {
        if (c !== chainRef.current || rpc !== rpcRef.current) return;
        setCustomRPCValidated(true);
        setCustomRPCAvaliable(false);
      }
    }
  };

  useEffect(() => {
    chainRef.current = chain;
    rpcRef.current = customRPC;
    pingCustomRPC(chain, customRPC);
  }, [chain, customRPC, nonce]);

  return (
    <Tooltip
      placement="top"
      overlayClassName={clsx('rectangle')}
      title={
        customRPC && showCustomRPCToolTip ? (
          <CustomRPCTooltipContent
            rpc={customRPC}
            avaliable={customRPCAvaliable}
          />
        ) : null
      }
    >
      <ChainIconWrapper>
        <ChainIconEle className={clsx(size)} src={CHAINS[chain].logo} />
        {customRPC &&
          customRPCVlidated &&
          (customRPCAvaliable ? (
            <AvaliableIcon className={clsx(size)} />
          ) : (
            <UnavaliableIcon className={clsx(size)} />
          ))}
      </ChainIconWrapper>
    </Tooltip>
  );
};

export default ChainIcon;
