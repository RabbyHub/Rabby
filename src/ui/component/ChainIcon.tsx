import { Tooltip, TooltipProps } from 'antd';
import { CHAINS_ENUM, CHAINS } from '@debank/common';
import clsx from 'clsx';
import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import { useWallet } from '@/ui/utils';
import { findChain, findChainByEnum } from '@/utils/chain';
import { TooltipWithMagnetArrow } from './Tooltip/TooltipWithMagnetArrow';
import { t } from 'i18next';

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
  customRPC?: string | undefined;
  size?: 'normal' | 'small';
  showCustomRPCToolTip?: boolean;
  nonce?: number;
  innerClassName?: string;
  tooltipTriggerElement?: 'chain' | 'dot';
  tooltipProps?: Omit<TooltipProps, 'title' | 'overlay'>;
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
  customRPC: _customRPC,
  size = 'normal',
  showCustomRPCToolTip = false,
  nonce,
  innerClassName,
  tooltipTriggerElement = 'chain',
  tooltipProps,
}: Props) => {
  const wallet = useWallet();
  const [customRPCAvaliable, setCustomRPCAvaliable] = useState(true);
  const [customRPCVlidated, setCustomRPCValidated] = useState(false);
  const chainRef = useRef(chain);
  const rpcRef = useRef(_customRPC);

  const pingCustomRPC = async (c: CHAINS_ENUM, rpc: string | undefined) => {
    setCustomRPCValidated(false);
    if (rpc) {
      try {
        const rpcAvailable = await wallet.pingCustomRPC(c);
        if (rpcAvailable) {
          if (c !== chainRef.current || rpc !== rpcRef.current) return;
          setCustomRPCValidated(true);
          setCustomRPCAvaliable(true);
        } else {
          if (c !== chainRef.current || rpc !== rpcRef.current) return;
          setCustomRPCValidated(true);
          setCustomRPCAvaliable(false);
        }
      } catch (e) {
        if (c !== chainRef.current || rpc !== rpcRef.current) return;
        setCustomRPCValidated(true);
        setCustomRPCAvaliable(false);
      }
    }
  };

  useEffect(() => {
    chainRef.current = chain;
    rpcRef.current = _customRPC;
    pingCustomRPC(chain, _customRPC);
  }, [chain, _customRPC, nonce]);

  const { chainItem, customRPC } = React.useMemo(() => {
    const item = findChain({ enum: chain });
    return {
      chainItem: item,
      customRPC: item ? _customRPC : undefined,
    };
  }, [chain, _customRPC]);

  if (tooltipTriggerElement === 'chain') {
    return (
      <Tooltip
        placement="top"
        overlayClassName={clsx('rectangle')}
        {...tooltipProps}
        title={
          customRPC && showCustomRPCToolTip ? (
            <CustomRPCTooltipContent
              rpc={customRPC}
              avaliable={customRPCAvaliable}
            />
          ) : null
        }
      >
        <ChainIconWrapper className="chain-icon-comp">
          <ChainIconEle
            className={clsx(size, innerClassName)}
            src={chainItem?.logo || ''}
          />
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
  } else {
    return (
      <div className="chain-icon-comp">
        <Tooltip
          placement="top"
          overlayClassName={clsx('rectangle')}
          title={chainItem?.name}
          align={{
            offset: [0, 2],
          }}
        >
          <ChainIconWrapper>
            <ChainIconEle
              className={clsx(size, innerClassName)}
              src={chainItem?.logo || ''}
            />
          </ChainIconWrapper>
        </Tooltip>
        <Tooltip
          placement="top"
          overlayClassName={clsx('rectangle')}
          {...tooltipProps}
          title={
            customRPC && showCustomRPCToolTip ? (
              <CustomRPCTooltipContent
                rpc={customRPC}
                avaliable={customRPCAvaliable}
              />
            ) : null
          }
        >
          {customRPC &&
            customRPCVlidated &&
            (customRPCAvaliable ? (
              <AvaliableIcon className={clsx(size)} />
            ) : (
              <UnavaliableIcon className={clsx(size)} />
            ))}
        </Tooltip>
      </div>
    );
  }
};

export default ChainIcon;
