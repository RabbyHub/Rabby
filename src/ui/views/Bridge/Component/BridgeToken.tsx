import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import TokenSelect from '@/ui/component/TokenSelect';
import { findChainByEnum } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Input } from 'antd';
import clsx from 'clsx';
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TokenRender } from '../../Swap/Component/TokenRender';
import {
  formatTokenAmount,
  formatUsdValue,
  isSameAddress,
  useWallet,
} from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { MaxButton } from '../../SendToken/components/MaxButton';
import { tokenAmountBn } from '@/ui/utils/token';
import SkeletonInput from 'antd/lib/skeleton/Input';
import styled from 'styled-components';
import BridgeToTokenSelect from './BridgeToTokenSelect';
import { ReactComponent as RcIconInfoCC } from 'ui/assets/info-cc.svg';
import { useSetSettingVisible } from '../hooks';
import { useRabbySelector } from '@/ui/store';
import { useAsync } from 'react-use';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';

const StyledInput = styled(Input)`
  color: var(--r-neutral-title1, #192945);
  font-size: 24px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
  background: transparent !important;
  padding-left: 0;
  & > .ant-input {
    color: var(--r-neutral-title1, #192945);
    font-size: 24px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
    border-width: 0px !important;
    border-color: transparent;
  }

  &::placeholder {
    color: var(--r-neutral-foot, #6a7587);
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

export const BridgeToken = ({
  type = 'from',
  token,
  chain,
  // excludeTokens,
  excludeChains,
  onChangeToken,
  onChangeChain,
  value,
  onInputChange,
  valueLoading,
  fromChainId,
  fromTokenId,
  noQuote,
  inSufficient,
  handleSetGasPrice,
}: {
  type?: 'from' | 'to';
  token?: TokenItem;
  chain?: CHAINS_ENUM;
  // excludeTokens?: TokenItem['id'][];
  excludeChains?: CHAINS_ENUM[];
  onChangeToken: (token: TokenItem) => void;
  onChangeChain: (chain: CHAINS_ENUM) => void;
  value?: string | number;
  onInputChange?: (v: string) => void;
  inSufficient?: boolean;
  handleSetGasPrice?: (gasPrice?: number) => void;

  valueLoading?: boolean;
  fromChainId?: string;
  fromTokenId?: string;
  noQuote?: boolean;
}) => {
  const { t } = useTranslation();

  const supportedChains = useRabbySelector((s) => s.bridge.supportedChains);

  const isFromToken = type === 'from';
  const isToToken = type === 'to';

  const name = isFromToken ? t('page.bridge.From') : t('page.bridge.To');
  const chainObj = findChainByEnum(chain);

  const openFeePopup = useSetSettingVisible();

  const isMaxRef = useRef(false);

  const inputRef = useRef<Input>();

  const fromTokenIsNativeToken = useMemo(() => {
    if (isFromToken && token && chain) {
      return isSameAddress(
        token.id,
        findChainByEnum(chain)!.nativeTokenAddress
      );
    }
    return false;
  }, [token, chain, isFromToken]);

  const nativeTokenDecimals = useMemo(
    () => findChainByEnum(chain)?.nativeTokenDecimals || 1e18,
    [chain]
  );

  useEffect(() => {
    if (!fromTokenIsNativeToken) {
      handleSetGasPrice?.();
    }
  }, [fromTokenIsNativeToken]);

  const gasLimit = useMemo(
    () => (chain === CHAINS_ENUM.ETH ? 1000000 : 2000000),
    [chain]
  );

  const wallet = useWallet();

  const { value: gasList } = useAsync(async () => {
    if (!isFromToken) {
      return [];
    }

    return wallet.gasMarketV2({
      chainId: findChainByEnum(chain)!.serverId,
    });
  }, [chain, isFromToken]);

  const handleChangeFromToken = React.useCallback(
    (t: TokenItem) => {
      onChangeToken(t);
      if (t.id !== token?.id) {
        onInputChange?.('');
        setTimeout(() => {
          inputRef?.current?.focus?.();
        }, 200);
      }
    },
    [token, onInputChange, onChangeToken]
  );

  const changeChain = React.useCallback(
    (newChain: CHAINS_ENUM) => {
      if (chain !== newChain) {
        onChangeChain(newChain);
        if (isFromToken) {
          onInputChange?.('');
          setTimeout(() => {
            inputRef?.current?.focus?.();
          }, 200);
          handleSetGasPrice?.();
        }
      }
    },
    [onChangeChain, chain, isFromToken, onInputChange, handleSetGasPrice]
  );

  useLayoutEffect(() => {
    if (isFromToken) {
      if (
        document?.activeElement !== inputRef.current?.input &&
        !isMaxRef.current
      ) {
        inputRef.current?.focus();
      }
      isMaxRef.current = false;
    }
  }, [value]);

  const showNoQuote = useMemo(() => isToToken && !!noQuote, [type, noQuote]);

  const useValue = useMemo(() => {
    if (token && value) {
      return formatUsdValue(
        new BigNumber(value).multipliedBy(token.price || 0).toString()
      );
    }
    return '$0.00';
  }, [token?.price, value]);

  const inputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onInputChange?.(e.target.value);
      handleSetGasPrice?.();
    },
    [onInputChange]
  );

  const handleMax = React.useCallback(() => {
    if (token) {
      isMaxRef.current = true;
      if (isFromToken && fromTokenIsNativeToken && gasList) {
        const checkGasIsEnough = (price: number) => {
          return new BigNumber(token?.raw_amount_hex_str || 0, 16).gte(
            new BigNumber(gasLimit).times(price)
          );
        };
        const normalPrice =
          gasList?.find((e) => e.level === 'normal')?.price || 0;
        const isNormalEnough = checkGasIsEnough(normalPrice);
        if (isNormalEnough) {
          const val = tokenAmountBn(token).minus(
            new BigNumber(gasLimit)
              .times(normalPrice)
              .div(10 ** nativeTokenDecimals)
          );
          onInputChange?.(val.toString(10));
          handleSetGasPrice?.(normalPrice);
          return;
        }
      }
      handleSetGasPrice?.();
      onInputChange?.(tokenAmountBn(token)?.toString(10));
    }
  }, [
    handleSetGasPrice,
    token?.raw_amount_hex_str,
    onInputChange,
    nativeTokenDecimals,
    isFromToken,
    fromTokenIsNativeToken,
    gasList,
  ]);

  return (
    <div
      className={clsx(
        'h-[156px] bg-r-neutral-card1 rounded-[8px]',
        'border-[0.5px] border-solid border-rabby-neutral-line'
      )}
    >
      <div
        className={clsx(
          'flex items-center gap-8',
          'px-16 py-12',
          'border-b-[0.5px] border-solid border-rabby-neutral-line'
        )}
      >
        <span className="text-12 text-r-neutral-body">{name}</span>
        <ChainSelectorInForm
          mini
          hideTestnetTab
          value={chain}
          onChange={changeChain}
          title={<div className="mt-8">{t('page.bridge.select-chain')}</div>}
          excludeChains={excludeChains}
          supportChains={supportedChains}
          drawerHeight={540}
          showClosableIcon
        />
      </div>

      <div className={clsx('p-16 pb-[18px]')}>
        <div className={clsx('flex justify-between items-center')}>
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
              className={clsx(inSufficient && 'text-rabby-red-default')}
              placeholder={showNoQuote ? t('page.bridge.no-quote') : '0'}
              value={value}
              onChange={inputChange}
              readOnly={!isFromToken}
              ref={inputRef as any}
            />
          )}
          {isToToken ? (
            <BridgeToTokenSelect
              drawerHeight={540}
              fromChainId={fromChainId!}
              fromTokenId={fromTokenId!}
              token={token}
              onTokenChange={onChangeToken}
              chainId={chainObj?.serverId}
              type={'to'}
              placeholder={t('page.swap.search-by-name-address')}
              tokenRender={(p) => <TokenRender {...p} type="bridge" />}
            />
          ) : (
            <TokenSelect
              drawerHeight={540}
              token={token}
              onTokenChange={handleChangeFromToken}
              chainId={chainObj?.serverId}
              type={'bridgeFrom'}
              placeholder={t('page.swap.search-by-name-address')}
              disabledTips={t('page.bridge.insufficient-balance')}
              tokenRender={(p) => <TokenRender {...p} type="bridge" />}
              supportChains={supportedChains}
            />
          )}
        </div>

        <div
          className={clsx(
            'flex justify-between items-center',
            'mt-14 text-13 text-r-neutral-foot'
          )}
        >
          <div className="flex items-center gap-2">
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
              <span>{useValue}</span>
            )}
            {!valueLoading && isToToken && !!value && (
              <RcIconInfoCC
                onClick={() => openFeePopup(true)}
                viewBox="0 0 14 14"
                className="w-14 h-14 text-r-neutral-foot cursor-pointer"
              />
            )}
          </div>
          <div className="flex items-center gap-4 relative">
            <div className="flex items-center gap-4">
              <RcIconWalletCC viewBox="0 0 16 16" className="w-16 h-16" />
              <span>
                {token
                  ? formatTokenAmount(tokenAmountBn(token).toString(10)) || '0'
                  : 0}
              </span>
            </div>
            {isFromToken && (
              <TooltipWithMagnetArrow
                visible={fromTokenIsNativeToken ? undefined : false}
                className="rectangle w-[max-content]"
                title={t('page.bridge.max-tips')}
              >
                <MaxButton className="ml-0" onClick={handleMax}>
                  {t('page.swap.max')}
                </MaxButton>
              </TooltipWithMagnetArrow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
