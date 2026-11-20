import { Tooltip, TooltipProps } from 'antd';
import { CHAINS_ENUM, CHAINS } from '@debank/common';
import clsx from 'clsx';
import React, { useEffect, useState, useRef } from 'react';
import { useWallet } from '@/ui/utils';
import { findChain, findChainByEnum } from '@/utils/chain';
import { TooltipWithMagnetArrow } from './Tooltip/TooltipWithMagnetArrow';
import { t } from 'i18next';
import { cn } from '@/ui/utils/cn';
import styles from './ChainIcon.module.css';

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
    <div
      className={cn(styles.tooltipContent, {
        avaliable,
        unavaliable: !avaliable,
      })}
    >
      <div className="alert-icon" />
      <span>
        RPC {avaliable ? 'avaliable' : 'unavailable'}: {rpc}
      </span>
    </div>
  );
};

const ChainIcon = ({
  chain,
  customRPC: _customRPC,
  size = 'normal',
  showCustomRPCToolTip = false,
  nonce,
  innerClassName,
  tooltipTriggerElement = 'dot',
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
        <div className="chain-icon-comp relative">
          <img
            className={cn(styles.chainIcon, size, innerClassName)}
            src={chainItem?.logo || ''}
          />
          {customRPC &&
            customRPCVlidated &&
            (customRPCAvaliable ? (
              <div
                className={cn(
                  size,
                  'absolute right-[-2px] top-[-2px] border border-[#ffffff] bg-[#27c193] rounded-full overflow-hidden',
                  size === 'small' ? 'w-[8px] h-[8px]' : 'w-[10px] h-[10px]'
                )}
              />
            ) : (
              <div
                className={cn(
                  size,
                  'absolute right-[-2px] top-[-2px] border border-[#ffffff] bg-[#ec5151] rounded-full overflow-hidden',
                  size === 'small' ? 'w-[8px] h-[8px]' : 'w-[10px] h-[10px]'
                )}
              />
            ))}
        </div>
      </Tooltip>
    );
  } else {
    return (
      <div className="chain-icon-comp relative">
        <Tooltip
          placement="top"
          overlayClassName={clsx('rectangle')}
          title={chainItem?.name}
          align={{
            offset: [0, 2],
          }}
          {...tooltipProps}
        >
          <div className="relative">
            <img
              className={cn(styles.chainIcon, size, innerClassName)}
              src={chainItem?.logo || ''}
            />
          </div>
        </Tooltip>
        <TooltipWithMagnetArrow
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
              <div
                className={cn(
                  size,
                  'absolute right-[-2px] top-[-2px] border border-[#ffffff] bg-[#27c193] rounded-full overflow-hidden',
                  size === 'small' ? 'w-[8px] h-[8px]' : 'w-[10px] h-[10px]'
                )}
              />
            ) : (
              <div
                className={cn(
                  size,
                  'absolute right-[-2px] top-[-2px] border border-[#ffffff] bg-[#ec5151] rounded-full overflow-hidden',
                  size === 'small' ? 'w-[8px] h-[8px]' : 'w-[10px] h-[10px]'
                )}
              />
            ))}
        </TooltipWithMagnetArrow>
      </div>
    );
  }
};

export default ChainIcon;
