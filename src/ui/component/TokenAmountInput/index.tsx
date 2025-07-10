import { useSearchTestnetToken } from '@/ui/hooks/useSearchTestnetToken';
import { useRabbySelector } from '@/ui/store';
import { useTokens } from '@/ui/utils/portfolio/token';
import { findChain } from '@/utils/chain';
import { DrawerProps, Input, Modal, Skeleton } from 'antd';
import { TokenItem } from 'background/service/openapi';
import clsx from 'clsx';
import uniqBy from 'lodash/uniqBy';
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useSearchToken from 'ui/hooks/useSearchToken';
import useSortToken from 'ui/hooks/useSortTokens';
import { splitNumberByStep, useWallet } from 'ui/utils';
import { abstractTokenToTokenItem, getTokenSymbol } from 'ui/utils/token';
import TokenSelector, { TokenSelectorProps } from '../TokenSelector';
import TokenWithChain from '../TokenWithChain';
import './style.less';
import { INPUT_NUMBER_RE, filterNumber } from '@/constant/regexp';
import { MaxButton } from '@/ui/views/SendToken/components/MaxButton';
import { useTranslation } from 'react-i18next';
import { ReactComponent as RcIconWalletCC } from '@/ui/assets/swap/wallet-cc.svg';
import { ReactComponent as RcIconDownCC } from '@/ui/assets/dashboard/arrow-down-cc.svg';
import styled from 'styled-components';
import { RiskWarningTitle } from '../RiskWarningTitle';

interface TokenAmountInputProps {
  token: TokenItem;
  value?: string;
  isLoading?: boolean;
  onChange?(amount: string): void;
  onTokenChange(token: TokenItem): void;
  chainId: string;
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
  font-size: 24px !important;
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
    border-right-width: 0px !important;
    border-color: transparent !important;
    &:hover,
    &:focus {
      border-right-width: 0px !important;
      border-color: transparent !important;
    }
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

const TokenAmountInput = ({
  token,
  value,
  onChange,
  onTokenChange,
  chainId,
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
  disableItemCheck,
}: TokenAmountInputProps) => {
  const tokenInputRef = useRef<Input>(null);
  const [updateNonce, setUpdateNonce] = useState(0);
  const [tokenSelectorVisible, setTokenSelectorVisible] = useState(false);
  const currentAccount = useRabbySelector(
    (state) => state.account.currentAccount
  );
  const wallet = useWallet();
  const [keyword, setKeyword] = useState('');
  const [chainServerId, setChainServerId] = useState(chainId);
  const { t } = useTranslation();

  const chainItem = useMemo(
    () =>
      findChain({
        serverId: chainServerId,
      }),
    [chainServerId]
  );

  const isTestnet = chainItem?.isTestnet;

  useLayoutEffect(() => {
    if (amountFocus && !tokenSelectorVisible) {
      tokenInputRef.current?.focus();
    }
  }, [amountFocus, tokenSelectorVisible]);

  const checkBeforeConfirm = (token: TokenItem) => {
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
  };

  const handleCurrentTokenChange = (token: TokenItem) => {
    onChange && onChange('');
    onTokenChange(token);
    setTokenSelectorVisible(false);
    tokenInputRef.current?.focus();
    setChainServerId(token.chain);
  };

  const handleTokenSelectorClose = () => {
    setChainServerId(chainId);
    setTokenSelectorVisible(false);
  };

  const handleSelectToken = () => {
    if (allTokens.length > 0) {
      setUpdateNonce(updateNonce + 1);
    }
    setTokenSelectorVisible(true);
  };

  // when no any queryConds
  const { tokens: allTokens, isLoading: isLoadingAllTokens } = useTokens(
    currentAccount?.address,
    undefined,
    tokenSelectorVisible,
    updateNonce,
    chainServerId
  );

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
    enabled: isTestnet,
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
    if (isTestnet) {
      return isSearchTestnetLoading;
    }
    return keyword ? isSearchLoading : isLoadingAllTokens;
  }, [
    keyword,
    isSearchLoading,
    isLoadingAllTokens,
    isSearchTestnetLoading,
    isTestnet,
  ]);

  const handleSearchTokens = React.useCallback(async (ctx) => {
    setKeyword(ctx.keyword);
    setChainServerId(ctx.chainServerId);
  }, []);

  useEffect(() => {
    setChainServerId(chainId);
  }, [chainId]);

  const valueNum = Number(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (INPUT_NUMBER_RE.test(e.target.value)) {
      onChange?.(filterNumber(e.target.value));
    }
  };

  return (
    <div className={clsx('token-amount-input', className)}>
      <div className="right relative flex flex-col justify-between pt-[5px] overflow-hidden">
        <StyledInput
          ref={tokenInputRef}
          placeholder="0"
          className={clsx(
            !valueNum && 'h-[29px]',
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
          title={splitNumberByStep(
            ((valueNum || 0) * token.price || 0).toFixed(2)
          )}
        >
          {valueNum
            ? `$${splitNumberByStep(
                ((valueNum || 0) * token.price || 0).toFixed(2)
              )}`
            : '$0.00'}
        </div>
      </div>
      <div className="flex flex-col justify-between gap-[13px] items-end">
        <div className="left" onClick={handleSelectToken}>
          <TokenWithChain width="24px" height="24px" token={token} hideConer />
          <span className="token-input__symbol" title={getTokenSymbol(token)}>
            {getTokenSymbol(token)}
          </span>
          <div className="text-r-neutral-foot ml-[6px]">
            <RcIconDownCC width={16} height={16} />
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
          {token.amount > 0 && !isLoading && (
            <MaxButton onClick={handleClickMaxButton}>
              {t('page.sendToken.max')}
            </MaxButton>
          )}
        </div>
      </div>
      <TokenSelector
        visible={tokenSelectorVisible}
        list={isTestnet ? testnetTokenList : displayTokenList}
        onConfirm={checkBeforeConfirm}
        onCancel={handleTokenSelectorClose}
        onSearch={handleSearchTokens}
        isLoading={isListLoading}
        type={type}
        disableItemCheck={disableItemCheck}
        // showCustomTestnetAssetList
        placeholder={placeholder}
        chainId={chainServerId}
        getContainer={getContainer}
      />
    </div>
  );
};

export default TokenAmountInput;
