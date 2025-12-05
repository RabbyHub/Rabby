/* eslint "react-hooks/exhaustive-deps": ["error"] */
/* eslint-enable react-hooks/exhaustive-deps */
import { useSearchTestnetToken } from '@/ui/hooks/useSearchTestnetToken';
import { useRabbySelector } from '@/ui/store';
import { useTokens } from '@/ui/utils/portfolio/token';
import { findChain, findChainByEnum } from '@/utils/chain';
import { DrawerProps, Input, Modal, Skeleton } from 'antd';
import { TokenItem } from 'background/service/openapi';
import clsx from 'clsx';
import uniqBy from 'lodash/uniqBy';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useSearchToken from 'ui/hooks/useSearchToken';
import useSortToken from 'ui/hooks/useSortTokens';
import { formatUsdValue, splitNumberByStep, useWallet } from 'ui/utils';
import { abstractTokenToTokenItem, getTokenSymbol } from 'ui/utils/token';
import TokenSelector, { TokenSelectorProps } from '../TokenSelector';
import TokenWithChain from '../TokenWithChain';
import './style.less';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';
import { MaxButton } from '@/ui/views/SendToken/components/MaxButton';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { ReactComponent as RcArrowDown } from './icons/arrow-down.svg';
import styled from 'styled-components';
import { RiskWarningTitle } from '../RiskWarningTitle';
import BigNumber from 'bignumber.js';
import { ChainSelectorInSend } from '@/ui/views/SendToken/components/ChainSelectorInSend';
import { Chain } from '@debank/common';

interface TokenAmountInputProps {
  token: TokenItem | null;
  value?: string;
  isLoading?: boolean;
  initLoading?: boolean;
  onChange?(amount: string): void;
  onTokenChange(token: TokenItem): void;
  onStartSelectChain?: () => void;
  amountFocus?: boolean;
  excludeTokens?: TokenItem['id'][];
  className?: string;
  type?: TokenSelectorProps['type'];
  insufficientError?: boolean;
  placeholder?: string;
  getContainer?: DrawerProps['getContainer'];
  balanceNumText?: string;
  handleClickMaxButton?: () => void;
  disableItemCheck?: (
    token: TokenItem
  ) => {
    disable: boolean;
    cexId?: string;
    reason: string;
    shortReason: string;
  };
}

const StyledInput = styled(Input)`
  color: var(--r-neutral-title1, #192945);
  font-size: 28px !important;
  font-style: normal;
  font-weight: 700;
  line-height: 36px;
  background: transparent !important;
  padding-left: 0;
  &::placeholder {
    color: var(--r-neutral-foot, #6a7587);
    font-size: 28px !important;
    font-style: normal;
    font-weight: 700;
    line-height: 36px;
  }

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

function isTestchain(chainServerId?: Chain['serverId']) {
  if (!chainServerId) return false;

  const chain = findChain({ serverId: chainServerId });
  return chain?.isTestnet;
}

const TokenAmountInput = ({
  token,
  value,
  onChange,
  onTokenChange,
  onStartSelectChain,
  // chainId,
  amountFocus,
  excludeTokens = [],
  className,
  type = 'default',
  placeholder,
  getContainer,
  balanceNumText,
  handleClickMaxButton,
  insufficientError,
  isLoading,
  initLoading,
  disableItemCheck,
}: TokenAmountInputProps) => {
  const tokenInputRef = useRef<Input>(null);
  const [updateNonce, setUpdateNonce] = useState(0);
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const selectorOpened = useRef(false);
  const currentAccount = useRabbySelector(
    (state) => state.account.currentAccount
  );
  const wallet = useWallet();
  const [keyword, setKeyword] = useState('');
  const [chainServerId, setChainServerId] = useState(
    (isTestchain(token?.chain) ? '' : token?.chain) || ''
  );
  const { t } = useTranslation();

  const chainItem = useMemo(
    () =>
      !chainServerId
        ? null
        : findChain({
            serverId: chainServerId,
          }),
    [chainServerId]
  );

  useLayoutEffect(() => {
    if (amountFocus && !tokenSelectorVisible) {
      tokenInputRef.current?.focus();
    }
  }, [amountFocus, tokenSelectorVisible]);

  const handleCurrentTokenChange = useCallback(
    (token: TokenItem) => {
      onChange && onChange('');
      onTokenChange(token);
      setTokenSelectorVisible(false);
      tokenInputRef.current?.focus();
      setChainServerId(isTestchain(token?.chain) ? '' : token?.chain || '');
    },
    [onChange, onTokenChange]
  );

  const handleTokenSelectorClose = useCallback(() => {
    setChainServerId(isTestchain(token?.chain) ? '' : token?.chain || '');
    setTokenSelectorVisible(false);
  }, [token?.chain]);

  const checkBeforeConfirm = useCallback(
    (token: TokenItem) => {
      const { disable, reason, cexId } = disableItemCheck?.(token) || {};
      if (disable) {
        Modal.confirm({
          width: 340,
          closable: true,
          closeIcon: <></>,
          centered: true,
          className: 'token-selector-disable-item-tips',
          title: <RiskWarningTitle />,
          content: reason,
          okText: t('global.proceedButton'),
          cancelText: t('global.cancelButton'),
          cancelButtonProps: {
            type: 'ghost',
            className: 'text-r-blue-default border-r-blue-default',
          },
          onOk() {
            if (cexId) {
              wallet.openapi.checkCex({
                chain_id: token.chain,
                id: token.id,
                cex_id: cexId,
              });
            }
            handleCurrentTokenChange(token);
          },
        });
        return;
      }
      handleCurrentTokenChange(token);
    },
    [disableItemCheck, t, wallet, handleCurrentTokenChange]
  );

  // when no any queryConds
  const { tokens: allTokens, isLoading: isLoadingAllTokens } = useTokens(
    currentAccount?.address,
    undefined,
    selectorOpened.current ? tokenSelectorVisible : true,
    updateNonce,
    chainServerId
  );

  const handleSelectToken = useCallback(() => {
    if (allTokens.length > 0) {
      setUpdateNonce(updateNonce + 1);
    }
    setTokenSelectorVisible(true);
  }, [allTokens, updateNonce]);

  const allDisplayTokens = useMemo(() => {
    return allTokens.map(abstractTokenToTokenItem);
  }, [allTokens]);

  const {
    isLoading: isSearchLoading,
    list: searchedTokenByQuery,
  } = useSearchToken(currentAccount?.address, keyword, chainServerId, true);

  const {
    loading: isSearchTestnetLoading,
    testnetTokenList,
  } = useSearchTestnetToken({
    address: currentAccount?.address,
    withBalance: true,
    chainId: chainItem?.id,
    q: keyword,
    enabled: chainItem?.isTestnet,
  });

  const availableToken = useMemo(() => {
    const allTokens = chainServerId
      ? allDisplayTokens.filter((token) => token.chain === chainServerId)
      : allDisplayTokens;
    return uniqBy(
      keyword ? searchedTokenByQuery.map(abstractTokenToTokenItem) : allTokens,
      (token) => {
        return `${token.chain}-${token.id}`;
      }
    ).filter((e) => !excludeTokens.includes(e.id));
  }, [
    allDisplayTokens,
    searchedTokenByQuery,
    excludeTokens,
    keyword,
    chainServerId,
  ]);
  const displayTokenList = useSortToken(availableToken);

  const isListLoading = useMemo(() => {
    if (chainItem?.isTestnet) {
      return isSearchTestnetLoading;
    }
    return keyword ? isSearchLoading : isLoadingAllTokens;
  }, [
    keyword,
    isSearchLoading,
    isLoadingAllTokens,
    isSearchTestnetLoading,
    chainItem?.isTestnet,
  ]);

  const handleSearchTokens = React.useCallback<
    React.ComponentProps<typeof TokenSelector>['onSearch'] & object
  >(async (ctx) => {
    setKeyword(ctx.keyword);
    setChainServerId(ctx.chainServerId || '');
  }, []);

  // useEffect(() => {
  //   setChainServerId(token?.chain || '');
  // }, [token?.chain]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (INPUT_NUMBER_RE.test(e.target.value)) {
      onChange?.(filterNumber(e.target.value));
    }
  };

  const useValue = useMemo(() => {
    if (token && value) {
      return formatUsdValue(
        new BigNumber(value).multipliedBy(token.price || 0).toString()
      );
    }
    return '$0.00';
  }, [token, value]);

  const chainSelectorRef = useRef<ChainSelectorInSend>(null);

  return (
    <div className={clsx('token-amount-input', className)}>
      <div
        className="right relative flex flex-col justify-between pt-[5px] overflow-hidden"
        style={{ paddingRight: 32 }}
      >
        <StyledInput
          ref={tokenInputRef}
          placeholder="0"
          className={clsx(
            !value && 'h-[29px]',
            insufficientError && 'text-rabby-red-default'
          )}
          autoFocus
          value={value}
          size="large"
          onChange={handleChange}
          title={value}
        />

        <div
          className="text-r-neutral-foot font-normal text-[13px] max-w-full truncate"
          title={useValue}
        >
          {useValue}
        </div>
      </div>
      <div className="flex flex-col justify-between gap-[13px] items-end">
        <div className="left" onClick={handleSelectToken}>
          {initLoading ? (
            <>
              <Skeleton.Avatar className="bg-r-neutral-line w-[24px] h-[24px] rounded-full" />
              <Skeleton.Input className="bg-r-neutral-line w-[58px] h-[20px] rounded-[2px] ml-[6px] mr-[6px]" />
            </>
          ) : (
            <>
              {!!token && (
                <TokenWithChain
                  width="24px"
                  height="24px"
                  token={token}
                  // hideChainIcon
                  hideConer
                />
              )}
              <span
                className={clsx(
                  'token-input__symbol',
                  token ? '' : 'max-w-max leading-[24px]'
                )}
                title={
                  token
                    ? getTokenSymbol(token)
                    : t('page.sendToken.selectToken')
                }
              >
                {token
                  ? getTokenSymbol(token)
                  : t('page.sendToken.selectToken')}
              </span>
            </>
          )}
          <div className="text-r-neutral-foot ml-[6px]">
            {/* <RcIconDownCC width={16} height={16} /> */}
            <RcArrowDown width={20} height={20} />
          </div>
        </div>
        <div className="flex items-center">
          {isLoading ? (
            <Skeleton.Input active style={{ width: 100 }} />
          ) : (
            <div
              className={clsx(
                'flex items-center gap-4',
                insufficientError
                  ? 'text-rabby-red-default'
                  : 'text-r-neutral-foot'
              )}
            >
              <RcIconWalletCC viewBox="0 0 16 16" className="w-16 h-16" />
              <span
                className={clsx(
                  'truncate max-w-[90px] text-[13px] font-normal'
                )}
                title={balanceNumText}
              >
                {balanceNumText}
              </span>
            </div>
          )}
          {token && token.amount > 0 && !isLoading && (
            <MaxButton onClick={handleClickMaxButton}>
              {t('page.sendToken.max')}
            </MaxButton>
          )}
        </div>
      </div>
      <TokenSelector
        visible={tokenSelectorVisible}
        list={chainItem?.isTestnet ? testnetTokenList : displayTokenList}
        onConfirm={checkBeforeConfirm}
        onCancel={handleTokenSelectorClose}
        onSearch={handleSearchTokens}
        isLoading={isListLoading}
        type={type}
        disableItemCheck={disableItemCheck}
        showCustomTestnetAssetList
        placeholder={placeholder}
        chainId={chainServerId}
        getContainer={getContainer}
        onStartSelectChain={() => {
          chainSelectorRef.current?.toggleShow(true);
          onStartSelectChain?.();
        }}
      />
      <ChainSelectorInSend
        ref={chainSelectorRef}
        hideTestnetTab
        onChange={(value) => {
          setChainServerId(findChainByEnum(value)?.serverId || '');
        }}
      />
    </div>
  );
};

export default TokenAmountInput;
