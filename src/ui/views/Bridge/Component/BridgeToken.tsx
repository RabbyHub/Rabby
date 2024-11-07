import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import TokenSelect from '@/ui/component/TokenSelect';
import { findChainByEnum } from '@/utils/chain';
import { CHAINS_ENUM } from '@debank/common';
import { TokenItem } from '@rabby-wallet/rabby-api/dist/types';
import { Input } from 'antd';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TokenRender } from '../../Swap/Component/TokenRender';
import { formatTokenAmount, formatUsdValue } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { MaxButton } from '../../SendToken/components/MaxButton';
import { tokenAmountBn } from '@/ui/utils/token';
import SkeletonInput from 'antd/lib/skeleton/Input';
import styled from 'styled-components';
import BridgeToTokenSelect from './BridgeToTokenSelect';
import { ReactComponent as RcIconInfoCC } from 'ui/assets/info-cc.svg';
import { useSetSettingVisible } from '../hooks';

const StyledInput = styled(Input)`
  /* height: 46px; */
  color: var(--r-neutral-title1, #192945);
  font-size: 24px;
  font-style: normal;
  font-weight: 500;
  line-height: normal;
  /* border: 1px solid var(--r-neutral-line, #d3d8e0); */
  background: transparent !important;
  & > .ant-input {
    color: var(--r-neutral-title1, #192945);
    font-size: 24px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
    border-width: 0px !important;
    border-color: transparent;
  }
  /* &.ant-input-affix-wrapper:not(.ant-input-affix-wrapper-disabled):hover {
    border-width: 1px !important;
  } */

  /* &:active {
    border: 1px solid transparent;
  } */
  /* &:focus,
  &:focus-within {
    border-width: 1px !important;
    border-color: var(--r-blue-default, #7084ff) !important;
  }
  &:hover {
    border-width: 1px !important;
    border-color: var(--r-blue-default, #7084ff) !important;
    box-shadow: none;
  } */

  &:placeholder-shown {
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
  valueLoading?: boolean;
  fromChainId?: string;
  fromTokenId?: string;
}) => {
  const { t } = useTranslation();

  const isFromToken = type === 'from';

  const name = type === 'from' ? t('page.bridge.From') : t('page.bridge.To');
  const chainObj = findChainByEnum(chain);

  const openFeePopup = useSetSettingVisible();

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
    },
    [onInputChange]
  );

  const handleMax = React.useCallback(() => {
    if (token) {
      onInputChange?.(tokenAmountBn(token)?.toString(10));
    }
  }, [token?.raw_amount_hex_str, onInputChange]);

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
          onChange={onChangeChain}
          title={t('page.bridge.select-chain')}
          excludeChains={excludeChains}
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
              placeholder="0"
              value={value}
              onChange={inputChange}
              readOnly={!isFromToken}
            />
          )}
          {type === 'to' ? (
            <BridgeToTokenSelect
              fromChainId={fromChainId!}
              fromTokenId={fromTokenId!}
              token={token}
              onTokenChange={onChangeToken}
              chainId={chainObj?.serverId}
              type={'to'}
              placeholder={t('page.swap.search-by-name-address')}
              // excludeTokens={excludeTokens}
              tokenRender={(p) => <TokenRender {...p} type="bridge" />}
            />
          ) : (
            <TokenSelect
              token={token}
              onTokenChange={onChangeToken}
              chainId={chainObj?.serverId}
              type={'bridgeFrom'}
              placeholder={t('page.swap.search-by-name-address')}
              // excludeTokens={excludeTokens}
              tokenRender={(p) => <TokenRender {...p} type="bridge" />}
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
            <span>{useValue}</span>
            {type === 'to' && !!value && (
              <RcIconInfoCC
                onClick={() => openFeePopup(true)}
                viewBox="0 0 14 14"
                className="w-14 h-14 text-r-neutral-foot cursor-pointer"
              />
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>
              {t('page.bridge.Balance')}

              {token
                ? formatTokenAmount(tokenAmountBn(token).toString(10)) || '0'
                : 0}
            </span>
            {isFromToken && (
              <MaxButton onClick={handleMax}>{t('page.swap.max')}</MaxButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
