import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { SwapSlider } from './Slider';
import { useTranslation } from 'react-i18next';
import TokenSelect from '@/ui/component/TokenSelect';
import { formatTokenAmount } from '@debank/common';
import { SWAP_SUPPORT_CHAINS } from '@/constant';
import { TokenRender } from './TokenRender';
import { Input } from 'antd';
import styled from 'styled-components';
import { formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { tokenAmountBn } from '@/ui/utils/token';
import clsx from 'clsx';
import SkeletonInput from 'antd/lib/skeleton/Input';
import { useRabbyDispatch } from '@/ui/store';
import { ReactComponent as RcIconInfoCC } from 'ui/assets/info-cc.svg';
import { QuoteProvider, useSetRabbyFee } from '../hooks';

const StyledInput = styled(Input)`
  height: 46px;
  font-weight: 500;
  box-shadow: none;
  border-radius: 4px;
  border: 1px solid transparent;
  background: transparent !important;
  font-size: 24px;
  text-align: right;
  & > .ant-input {
    font-weight: 500;
    font-size: 24px;
    text-align: right;
    border-width: 0px !important;
    border-color: transparent;
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
  onValueChange?: React.ChangeEventHandler<HTMLInputElement>;
  label?: React.ReactNode;
  slider?: number;
  onChangeSlider?: (value: number) => void;
  excludeTokens?: string[];
  inSufficient?: boolean;
  valueLoading?: boolean;
  currentQuote?: QuoteProvider;
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
  } = props;
  const { t } = useTranslation();

  const dispatch = useRabbyDispatch();

  const isFrom = type === 'from';

  const [balance, usdValue] = useMemo(() => {
    if (token) {
      const amount = tokenAmountBn(token);
      return [
        formatTokenAmount(amount.toString(10)),
        valueLoading
          ? formatUsdValue(0)
          : formatUsdValue(
              new BigNumber(value || 0).times(token.price).toString(10)
            ),
      ];
    }
    return [0, formatUsdValue(0)];
  }, [token, valueLoading, value]);

  const onTokenSelect = useCallback(
    (token: TokenItem) => {
      onTokenChange(token);
      if (type === 'to') {
        dispatch.swap.setRecentSwapToToken(token);
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

  const setRabbyFeeVisible = useSetRabbyFee();

  const openFeePopup = useCallback(() => {
    setRabbyFeeVisible({
      visible: true,
      dexName: currentQuote?.name || undefined,
      feeDexDesc: currentQuote?.quote?.dexFeeDesc || undefined,
    });
  }, [currentQuote?.name, currentQuote?.quote]);

  const inputRef = useRef<Input>();

  useLayoutEffect(() => {
    if (token?.id && isFrom) {
      inputRef.current?.focus();
    }
  }, [token?.id]);

  return (
    <div className="p-16 pb-20 h-[132px]">
      <div className="flex items-center justify-between">
        <span className="block w-[150px]">
          {isFrom ? t('page.swap.from') : t('page.swap.to')}
        </span>
        {isFrom && (
          <div className="w-[126px] flex items-center gap-12">
            <SwapSlider
              className="w-[126px]"
              value={slider}
              onChange={onChangeSlider}
              min={0}
              max={100}
              tooltipVisible={false}
            />
            <span className="w-[34px] text-13 text-r-blue-default font-medium">
              {slider}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-8 pb-12 h-[60px]">
        <TokenSelect
          token={token}
          onTokenChange={onTokenSelect}
          chainId={chainId}
          type={isFrom ? 'swapFrom' : 'swapTo'}
          placeholder={t('page.swap.search-by-name-address')}
          excludeTokens={excludeTokens}
          tokenRender={tokenRender}
          supportChains={SWAP_SUPPORT_CHAINS}
          useSwapTokenList={!isFrom}
          disabledTips={t('page.swap.insufficient-balance')}
        />

        {valueLoading ? (
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
            onChange={onValueChange}
            ref={inputRef as any}
            readOnly={!isFrom}
            className={clsx(
              !isFrom && 'cursor-default',
              isFrom && inSufficient && 'text-r-red-default'
            )}
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-rabby-neutral-foot">
          <RcIconWalletCC viewBox="0 0 16 16" className="w-16 h-16" />
          <span className="text-13 text-rabby-neutral-foot">{balance}</span>
        </div>
        <div className="text-13 text-rabby-neutral-foot flex items-center gap-2">
          {valueLoading ? (
            <SkeletonInput
              active
              className="rounded-[4px]"
              style={{
                width: 36,
                height: 16,
              }}
            />
          ) : (
            <span>{usdValue}</span>
          )}
          {!isFrom && !valueLoading && (
            <RcIconInfoCC
              onClick={openFeePopup}
              viewBox="0 0 14 14"
              className="w-14 h-14 text-r-neutral-foot cursor-pointer"
            />
          )}
        </div>
      </div>
    </div>
  );
};
