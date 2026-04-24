import ChainSelectorInForm, {
  ChainSelectorRef,
} from '@/ui/component/ChainSelector/InForm';
import TokenSelect from '@/ui/component/TokenSelect';
import { findChainByEnum, findChainByServerID } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { DrawerProps, Input, InputRef } from 'antd';
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
import { useRabbySelector } from '@/ui/store';
import { useAsync } from 'react-use';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import {
  convert18RawToTokenRaw,
  getGasTokenBalance,
} from '@/utils/transaction';
import { isTempoChain } from '@/utils/tempo';

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
  getContainer,
  skeletonLoading,
  disabled,
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
  getContainer?: DrawerProps['getContainer'];
  skeletonLoading?: boolean;
  disabled?: boolean;
}) => {
  const { t } = useTranslation();

  const supportedChains = useRabbySelector((s) => s.bridge.supportedChains);
  const userAddress = useRabbySelector(
    (s) => s.account.currentAccount?.address || ''
  );
  const wallet = useWallet();

  const isFromToken = type === 'from';
  const isToToken = type === 'to';

  const name = isFromToken ? t('page.bridge.From') : t('page.bridge.To');
  const chainObj = findChainByEnum(chain);

  const isMaxRef = useRef(false);
  const isReserveMaxRef = useRef(false);

  const inputRef = useRef<InputRef>();

  const chainSelectorRef = useRef<ChainSelectorRef>(null);

  const fromTokenIsNativeToken = useMemo(() => {
    if (isFromToken && token && chain) {
      return isSameAddress(
        token.id,
        findChainByEnum(chain)!.nativeTokenAddress
      );
    }
    return false;
  }, [token, chain, isFromToken]);

  const isTempoBridgeChain = useMemo(() => isTempoChain(chainObj?.serverId), [
    chainObj?.serverId,
  ]);

  const {
    value: tempoGasTokenInfo,
    loading: isTempoGasTokenLoading,
  } = useAsync(async () => {
    if (
      !isFromToken ||
      !chainObj?.id ||
      !isTempoBridgeChain ||
      !token?.id ||
      !userAddress
    ) {
      return null;
    }

    return getGasTokenBalance({
      wallet,
      address: userAddress,
      chainId: chainObj.id,
    });
  }, [
    wallet,
    userAddress,
    isFromToken,
    chainObj?.id,
    token?.id,
    isTempoBridgeChain,
  ]);

  const fromTokenIsTempoFeeToken = useMemo(() => {
    if (
      !isFromToken ||
      !isTempoBridgeChain ||
      !token?.id ||
      !tempoGasTokenInfo?.token.tokenId
    ) {
      return false;
    }

    return isSameAddress(token.id, tempoGasTokenInfo.token.tokenId);
  }, [
    isFromToken,
    isTempoBridgeChain,
    token?.id,
    tempoGasTokenInfo?.token.tokenId,
  ]);

  const fromTokenIsGasToken = useMemo(
    () => fromTokenIsNativeToken || fromTokenIsTempoFeeToken,
    [fromTokenIsNativeToken, fromTokenIsTempoFeeToken]
  );

  const nativeTokenDecimals = useMemo(
    () => findChainByEnum(chain)?.nativeTokenDecimals || 1e18,
    [chain]
  );

  const gasTokenDecimals = useMemo(() => {
    if (fromTokenIsNativeToken) {
      return nativeTokenDecimals;
    }

    if (fromTokenIsTempoFeeToken) {
      return tempoGasTokenInfo?.token.decimals || token?.decimals || 18;
    }

    return undefined;
  }, [
    fromTokenIsNativeToken,
    nativeTokenDecimals,
    fromTokenIsTempoFeeToken,
    tempoGasTokenInfo?.token.decimals,
    token?.decimals,
  ]);

  useEffect(() => {
    if (!fromTokenIsGasToken) {
      handleSetGasPrice?.();
    }
  }, [fromTokenIsGasToken, handleSetGasPrice]);

  const gasLimit = useMemo(
    () => (chain === CHAINS_ENUM.ETH ? 1000000 : 2000000),
    [chain]
  );

  const { value: gasList } = useAsync(async () => {
    if (!isFromToken) {
      return [];
    }

    return wallet.gasMarketV2({
      chainId: findChainByEnum(chain)!.serverId,
    });
  }, [chain, isFromToken]);

  const applyMaxAmount = React.useCallback(() => {
    if (!token) {
      return;
    }

    if (
      isFromToken &&
      fromTokenIsGasToken &&
      gasList &&
      gasTokenDecimals !== undefined
    ) {
      const checkGasIsEnough = (price: number) => {
        return new BigNumber(token?.raw_amount_hex_str || 0, 16).gte(
          convert18RawToTokenRaw(
            new BigNumber(gasLimit).times(price),
            gasTokenDecimals
          )
        );
      };
      const normalPrice =
        gasList?.find((e) => e.level === 'normal')?.price || 0;
      const isNormalEnough = checkGasIsEnough(normalPrice);
      if (isNormalEnough) {
        const val = tokenAmountBn(token).minus(
          convert18RawToTokenRaw(
            new BigNumber(gasLimit).times(normalPrice),
            gasTokenDecimals
          ).div(new BigNumber(10).pow(gasTokenDecimals))
        );
        onInputChange?.(val.toString(10));
        handleSetGasPrice?.(normalPrice);
        return;
      }
    }

    handleSetGasPrice?.();
    onInputChange?.(tokenAmountBn(token)?.toString(10));
  }, [
    token,
    isFromToken,
    fromTokenIsGasToken,
    gasList,
    gasTokenDecimals,
    gasLimit,
    onInputChange,
    handleSetGasPrice,
  ]);

  const handleChangeFromToken = React.useCallback(
    (t: TokenItem) => {
      const chainEnum = findChainByServerID(t?.chain || '')?.enum;
      if (t && chainEnum && chainEnum !== chain) {
        changeChain(chainEnum);
      }
      onChangeToken(t);
      isReserveMaxRef.current = false;
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
          isReserveMaxRef.current = false;
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
      isReserveMaxRef.current = false;
      onInputChange?.(e.target.value);
      handleSetGasPrice?.();
    },
    [onInputChange, handleSetGasPrice]
  );

  const handleMax = React.useCallback(() => {
    if (disabled) {
      return;
    }
    if (token) {
      isMaxRef.current = true;
      isReserveMaxRef.current = true;
      applyMaxAmount();
    }
  }, [disabled, token, applyMaxAmount]);

  useEffect(() => {
    if (isFromToken && disabled) {
      isReserveMaxRef.current = false;
      onInputChange?.('');
      handleSetGasPrice?.();
    }
  }, [isFromToken, disabled, onInputChange, handleSetGasPrice]);

  useEffect(() => {
    if (
      isFromToken &&
      isReserveMaxRef.current &&
      token &&
      gasList &&
      (!isTempoBridgeChain || !isTempoGasTokenLoading)
    ) {
      applyMaxAmount();
    }
  }, [
    isFromToken,
    token,
    gasList,
    isTempoBridgeChain,
    isTempoGasTokenLoading,
    applyMaxAmount,
  ]);

  return (
    <div className={clsx('h-[156px] bg-r-neutral-card1 rounded-[8px]')}>
      <div
        className={clsx(
          'flex items-center gap-8',
          'px-16 py-12',
          'border-b-[0.5px] border-solid border-rabby-neutral-line'
        )}
      >
        <span className="text-[13px] font-normal text-r-neutral-foot">
          {name}
        </span>
        <ChainSelectorInForm
          bridge
          hideTestnetTab
          value={chain}
          onChange={changeChain}
          // excludeChains={excludeChains}
          // supportChains={supportedChains}
          drawerHeight={540}
          showClosableIcon
          getContainer={getContainer}
          ref={chainSelectorRef}
          zIndex={1111}
        />
      </div>

      <div className={clsx('p-16 pb-[18px]')}>
        <div className={clsx('flex justify-between items-center')}>
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
              className={clsx(
                inSufficient && 'text-rabby-red-default',
                valueLoading && 'opacity-50'
              )}
              placeholder={showNoQuote ? t('page.bridge.no-quote') : '0'}
              value={value}
              onChange={inputChange}
              readOnly={disabled || !isFromToken}
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
              placeholder={t('page.swap.search-by-token-name-address')}
              tokenRender={(p) => <TokenRender {...p} type="bridge" />}
              getContainer={getContainer}
            />
          ) : (
            <TokenSelect
              isHideTitle={true}
              drawerHeight={540}
              token={token}
              onTokenChange={handleChangeFromToken}
              chainId={chainObj?.serverId}
              type={'bridgeFrom'}
              placeholder={t('page.swap.search-by-token-name-address')}
              disabledTips={t('page.bridge.insufficient-balance')}
              tokenRender={(p) => <TokenRender {...p} type="bridge" />}
              // supportChains={supportedChains}
              getContainer={getContainer}
              onStartSelectChain={() => {
                chainSelectorRef.current?.toggleShow(true);
              }}
            />
          )}
        </div>

        <div
          className={clsx(
            'flex justify-between items-center',
            'mt-14 text-13 text-r-neutral-foot font-normal'
          )}
        >
          <div className="flex items-center gap-2">
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
                {useValue}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 relative">
            <div
              className={clsx(
                'flex items-center gap-4',

                isFromToken && inSufficient
                  ? 'text-rabby-red-default'
                  : 'text-r-neutral-foot'
              )}
            >
              <RcIconWalletCC viewBox="0 0 16 16" className="w-16 h-16" />
              <span className={clsx(valueLoading && 'opacity-50')}>
                {token
                  ? formatTokenAmount(tokenAmountBn(token).toString(10)) || '0'
                  : 0}
              </span>
            </div>
            {isFromToken && (
              // <TooltipWithMagnetArrow
              //   visible={fromTokenIsNativeToken ? undefined : false}
              //   className="rectangle w-[max-content]"
              //   title={t('page.bridge.max-tips')}
              // >
              <MaxButton
                className={clsx('ml-0', disabled && 'pointer-events-none')}
                onClick={handleMax}
              >
                {t('page.swap.max')}
              </MaxButton>
              // </TooltipWithMagnetArrow>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
