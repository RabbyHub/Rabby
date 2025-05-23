import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { SwapSlider } from './Slider';
import { useTranslation } from 'react-i18next';
import TokenSelect from '@/ui/component/TokenSelect';
import { formatTokenAmount } from '@debank/common';
import { SWAP_SUPPORT_CHAINS } from '@/constant';
import { TokenRender } from './TokenRender';
import { DrawerProps, Input } from 'antd';
import styled from 'styled-components';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { tokenAmountBn } from '@/ui/utils/token';
import clsx from 'clsx';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { QuoteProvider } from '../hooks';

const StyledInput = styled(Input)`
  &,
  & > .ant-input {
    height: 46px;
    font-weight: 500;
    box-shadow: none;
    border-radius: 4px;
    border: 1px solid transparent;
    background: transparent !important;
    font-size: 24px;
    text-align: right;
    padding-right: 0;
  }
  &.ant-input-affix-wrapper:not(.ant-input-affix-wrapper-disabled):hover {
    border-width: 1px !important;
  }

  &:active {
    border: 1px solid transparent;
  }
  &:focus,
  &:focus-within {
    border-width: 1px !important;
    border-color: transparent;
  }
  &:hover {
    border-width: 1px !important;
    border-color: transparent;
    box-shadow: none;
  }

  &:placeholder-shown {
    color: var(--r-neutral-foot, #6a7587);
  }
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

interface SwapTokenItemProps {
  type: 'from' | 'to';
  token?: TokenItem;
  value: string;
  chainId: string;
  onTokenChange: (token: TokenItem) => void;
  onValueChange?: (s: string) => void;
  label?: React.ReactNode;
  slider?: number;
  onChangeSlider?: (value: number, syncAmount?: boolean) => void;
  excludeTokens?: string[];
  inSufficient?: boolean;
  valueLoading?: boolean;
  currentQuote?: QuoteProvider;
  getContainer?: DrawerProps['getContainer'];
  skeletonLoading?: boolean;
  disabled?: boolean;
}

export const SwapTokenItem = (props: SwapTokenItemProps) => {
  const {
    type,
    token,
    value,
    onTokenChange,
    onValueChange,
    excludeTokens,
    chainId,
    slider,
    onChangeSlider,
    inSufficient,
    valueLoading,
    currentQuote,
    getContainer,
    skeletonLoading,
    disabled,
  } = props;

  const openTokenModalRef = useRef<{
    openTokenModal: React.Dispatch<React.SetStateAction<boolean>>;
  }>(null);

  const { t } = useTranslation();

  const inputRef = useRef<Input>();

  const isFrom = type === 'from';

  const handleTokenModalOpen = useCallback(() => {
    if (!isFrom) {
      openTokenModalRef?.current?.openTokenModal?.(true);
    }
  }, [isFrom]);

  const [balance, usdValue] = useMemo(() => {
    if (token) {
      const amount = tokenAmountBn(token);
      return [
        formatTokenAmount(amount.toString(10)),
        valueLoading
          ? formatUsdValue(0)
          : formatUsdValue(
              new BigNumber(value || 0).times(token.price || 0).toString(10)
            ),
      ];
    }
    return [0, formatUsdValue(0)];
  }, [token, valueLoading, value]);

  const onTokenSelect = useCallback(
    (newToken: TokenItem) => {
      onTokenChange(newToken);
      if (isFrom && newToken.id !== token?.id) {
        onValueChange?.('');
        setTimeout(() => {
          inputRef?.current?.focus?.();
        });
      }
    },
    [onTokenChange, type]
  );

  const tokenRender: ({
    token,
    openTokenModal,
  }: {
    token?: TokenItem;
    openTokenModal: () => void;
  }) => React.ReactNode = useCallback((p) => <TokenRender {...p} />, []);

  const isWrapQuote = useMemo(() => {
    return currentQuote?.name === 'WrapToken';
  }, [currentQuote?.name]);

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (!disabled) {
        onValueChange?.(e.target.value);
      }
    },
    [onValueChange]
  );

  const onAfterChangeSlider = useCallback(
    (value: number) => {
      if (!disabled) {
        onChangeSlider?.(value, true);
      }
    },
    [onChangeSlider]
  );

  useLayoutEffect(() => {
    if (token?.id && isFrom && !disabled) {
      inputRef.current?.focus();
    }
  }, [token?.id, disabled]);

  return (
    <div className="p-16 pb-20 h-[132px]">
      <div
        className={clsx(
          'flex items-center justify-between',
          !isFrom && 'cursor-pointer'
        )}
        onClick={handleTokenModalOpen}
      >
        <span className="block w-[150px] text-rabby-neutral-foot">
          {isFrom ? t('page.swap.from') : t('page.swap.to')}
        </span>
        {isFrom && (
          <div className="flex items-center gap-10 relative pr-[40px]">
            <SwapSlider
              className="w-[125px]"
              value={slider}
              onChange={onChangeSlider}
              onAfterChange={onAfterChangeSlider}
              min={0}
              max={100}
              tooltipVisible={false}
              disabled={!token || disabled}
            />
            <span className="absolute top-1/2 -right-12 transform -translate-y-1/2 w-[38px] text-13 text-r-blue-default font-medium">
              {slider}%
            </span>
          </div>
        )}
      </div>

      <div
        className={clsx(
          'flex items-center justify-between pt-8 pb-12 h-[60px]',
          !isFrom && 'cursor-pointer'
        )}
        onClick={handleTokenModalOpen}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <TokenSelect
            ref={openTokenModalRef}
            token={token}
            onTokenChange={onTokenSelect}
            chainId={chainId}
            type={isFrom ? 'swapFrom' : 'swapTo'}
            placeholder={t('page.swap.search-by-name-address')}
            // excludeTokens={excludeTokens}
            tokenRender={tokenRender}
            // supportChains={SWAP_SUPPORT_CHAINS}
            useSwapTokenList={!isFrom}
            disabledTips={t('page.swap.insufficient-balance')}
            getContainer={getContainer}
          />
        </div>

        {valueLoading && skeletonLoading ? (
          <SkeletonInput
            active
            className="rounded-[4px]"
            style={{
              width: 132,
              height: 28,
            }}
          />
        ) : (
          <StyledInput
            spellCheck={false}
            placeholder="0"
            value={value}
            onChange={onInputChange}
            ref={inputRef as any}
            readOnly={!isFrom}
            className={clsx(
              !isFrom && 'cursor-pointer',
              isFrom && inSufficient && 'text-r-red-default',
              valueLoading && 'opacity-50',
              disabled && 'pointer-events-none'
            )}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div
          className={clsx(
            'flex items-center gap-4 ',

            isFrom && inSufficient
              ? 'text-r-red-default'
              : 'text-rabby-neutral-foot'
          )}
        >
          <RcIconWalletCC viewBox="0 0 16 16" className="w-16 h-16" />
          <span className="text-13">{balance}</span>
        </div>
        <div className="text-13 text-rabby-neutral-foot flex items-center gap-2 relative">
          {valueLoading && skeletonLoading ? (
            <SkeletonInput
              active
              className="rounded-[4px]"
              style={{
                width: 36,
                height: 16,
              }}
            />
          ) : (
            <span className={clsx(valueLoading && 'opacity-50')}>
              {usdValue}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
