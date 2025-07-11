import React, { useMemo, forwardRef, HTMLAttributes, useEffect } from 'react';
import { CHAINS_ENUM, Chain } from '@debank/common';
import { Tooltip } from 'antd';
import clsx from 'clsx';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import ChainIcon from '../../ChainIcon';
import IconCheck from 'ui/assets/check-2.svg';
import IconPinned, {
  ReactComponent as RcIconPinned,
} from 'ui/assets/icon-pinned.svg';
import IconPinnedFill, {
  ReactComponent as RcIconPinnedFill,
} from 'ui/assets/icon-pinned-fill.svg';
import IconChainBalance, {
  ReactComponent as RcIconChainBalance,
} from 'ui/assets/chain-select/chain-balance.svg';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/riskWarning-cc.svg';

import { formatUsdValue } from '@/ui/utils';
import ThemeIcon from '../../ThemeMode/ThemeIcon';
import { TestnetChainLogo } from '../../TestnetChainLogo';

export type TDisableCheckChainFn = (
  chain: string
) => {
  disable: boolean;
  reason: string;
  shortReason: string;
};

export type SelectChainItemProps = {
  stared?: boolean;
  data: Chain;
  value?: CHAINS_ENUM;
  onStarChange?: (value: boolean) => void;
  onChange?: (value: CHAINS_ENUM) => void;
  disabled?: boolean;
  disabledTips?: string | ((ctx: { chain: Chain }) => string);
  showRPCStatus?: boolean;
  disableChainCheck?: TDisableCheckChainFn;
} & Omit<HTMLAttributes<HTMLDivElement>, 'onChange'>;

export const SelectChainItem = forwardRef(
  (
    {
      data,
      className,
      stared,
      value,
      onStarChange,
      onChange,
      disabled = false,
      disabledTips = 'Coming soon',
      showRPCStatus = false,
      disableChainCheck,
      ...rest
    }: SelectChainItemProps,
    ref: React.ForwardedRef<HTMLDivElement>
  ) => {
    const { customRPC, cachedChainBalances } = useRabbySelector((s) => ({
      customRPC: s.customRPC.customRPC,
      cachedChainBalances: {
        mainnet: s.account.matteredChainBalances,
        testnet: s.account.testnetMatteredChainBalances,
      },
    }));
    const dispatch = useRabbyDispatch();

    useEffect(() => {
      dispatch.customRPC.getAllRPC();
    }, []);

    const finalDisabledTips = useMemo(() => {
      if (typeof disabledTips === 'function') {
        return disabledTips({ chain: data });
      }

      return disabledTips;
    }, [disabledTips]);

    const chainBalanceItem = useMemo(() => {
      return (
        cachedChainBalances.mainnet?.[data.serverId] ||
        cachedChainBalances.testnet?.[data.serverId]
      );
    }, [cachedChainBalances]);

    const { disable: disableFromToAddress, shortReason } = useMemo(() => {
      return (
        disableChainCheck?.(data.serverId) || {
          disable: false,
          reason: '',
          shortReason: '',
        }
      );
    }, [data.serverId, disableChainCheck]);

    return (
      <Tooltip
        trigger={['click', 'hover']}
        mouseEnterDelay={3}
        overlayClassName={clsx('rectangle')}
        placement="top"
        title={finalDisabledTips}
        visible={disabled ? undefined : false}
        align={{ targetOffset: [0, -30] }}
      >
        <div
          className={clsx(
            'select-chain-item',
            disabled && 'opacity-50 select-chain-item-disabled cursor-default',
            {
              'opacity-80': disableFromToAddress,
            },
            className
          )}
          ref={ref}
          {...rest}
          onClick={() => !disabled && onChange?.(data.enum)}
        >
          <div className="w-full h-[60px] flex items-center">
            <div className="flex items-center flex-1">
              {data.isTestnet ? (
                data.logo ? (
                  <img
                    src={data.logo}
                    alt=""
                    className="select-chain-item-icon"
                  />
                ) : (
                  <TestnetChainLogo
                    name={data.name}
                    className="select-chain-item-icon"
                  />
                )
              ) : (
                <>
                  {showRPCStatus ? (
                    <ChainIcon
                      chain={data.enum}
                      customRPC={
                        customRPC[data.enum]?.enable
                          ? customRPC[data.enum].url
                          : ''
                      }
                      showCustomRPCToolTip
                    />
                  ) : (
                    <img
                      src={data.logo}
                      alt=""
                      className="select-chain-item-icon"
                    />
                  )}
                </>
              )}
              <div className="select-chain-item-info">
                <div className="select-chain-item-name">{data.name}</div>
                {!!chainBalanceItem?.usd_value && (
                  <div className="select-chain-item-balance">
                    <ThemeIcon
                      className="w-[14px] h-[14px] mt-2"
                      src={RcIconChainBalance}
                      // alt={formatUsdValue(chainBalanceItem?.usd_value || 0)}
                    />
                    <div className="ml-[6px] relative top-[2px]">
                      {formatUsdValue(chainBalanceItem?.usd_value || 0)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <ThemeIcon
              className={clsx(
                'select-chain-item-star w-16 h-16',
                stared ? 'is-active' : ''
              )}
              src={stared ? RcIconPinnedFill : RcIconPinned}
              onClick={(e) => {
                e.stopPropagation();
                onStarChange?.(!stared);
              }}
            />
            {value === data.enum ? (
              <img className="select-chain-item-checked" src={IconCheck}></img>
            ) : null}
          </div>
          {!!shortReason && (
            <div
              className={`
                      gap-2 rounded-[4px] bg-r-red-light
                      h-[31px] mt-[-2px] mb-14 w-full
                      flex justify-center items-center`}
            >
              <div className="text-r-red-default">
                <RcIconWarningCC />
              </div>
              <span className="text-[13px] font-medium text-r-red-default">
                {shortReason}
              </span>
            </div>
          )}
        </div>
      </Tooltip>
    );
  }
);
