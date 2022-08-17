import React, { useState, useEffect, useMemo, useRef } from 'react';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { Skeleton, Button, Tooltip, Space, Input, message } from 'antd';
import styled from 'styled-components';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { Account } from 'background/service/preference';
import { openInTab, useWalletOld } from 'ui/utils';
import { obj2query, query2obj } from 'ui/utils/url';
import { formatTokenAmount } from 'ui/utils/number';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import TagChainSelector from 'ui/component/ChainSelector/tag';
import { TokenItem } from 'background/service/openapi';
import { Modal, PageHeader } from 'ui/component';

import { ReactComponent as IconSwapArrowDown } from 'ui/assets/swap/arrow-down.svg';
import TokenSelect from '@/ui/component/TokenSelect';
import LessPalette from '@/ui/style/var-defs';
import clsx from 'clsx';
import { ReactComponent as IconInfo } from 'ui/assets/infoicon.svg';
import { ReactComponent as IconTipDownArrow } from 'ui/assets/swap/arrow-tips-down.svg';

const ReservedGas = 0.1;

const MaxButton = styled.div`
  padding: 4px 5px;
  background: rgba(134, 151, 255, 0.1);
  border-radius: 2px;
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  color: #8697ff;
  margin-left: 6px;
  cursor: pointer;
  &:hover {
    background: rgba(134, 151, 255, 0.2);
  }
`;

const SwapContainer = styled.div`
  position: relative;
  padding: 20px;
  padding-top: 0;
  background-color: ${LessPalette['@color-bg']};
  height: 100%;
`;

const Section = styled.div`
  padding: 12px;
  background-color: ${LessPalette['@color-white']};
  border-radius: 6px;
  margin-bottom: 12px;
`;

const AbsoluteFooter = styled.div`
  position: absolute;
  left: 0;
  bottom: 20px;
  width: 100%;
  display: flex;
  justify-content: center;
`;

const RotateArrow = styled.div`
  cursor: pointer;
  transition: transform 0.3s;
  &:hover {
    transform: rotate(180deg);
  }
`;

const SlippageItem = styled.div<{
  active?: boolean;
  errorBorder?: boolean;
}>`
  width: 82px;
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 4px;
  margin: 4px 0;
  border: 1px solid transparent;
  cursor: pointer;
  border-color: ${(props) =>
    props.active
      ? props.errorBorder
        ? LessPalette['@color-red']
        : LessPalette['@primary-color']
      : 'transparent'};
`;

const SlippageTip = styled.div<{
  error?: boolean;
  warn?: boolean;
}>`
  margin-top: 8px;
  font-size: 12px;
  line-height: 14px;
  color: ${(props) =>
    props.error
      ? LessPalette['@color-red']
      : props.warn
      ? LessPalette['@color-orange']
      : LessPalette['@color-comment']};
`;

const SLIPPAGE = [0.5, 1, 3] as const;

export type SwapSearchObj = {
  chain_enum?: CHAINS_ENUM;
  chain?: string;
  rawAmount?: string;
  payTokenId?: string;
  receiveTokenId?: string;
  slippage?: string;
  fetchQuoteError?: string;
  decimals?: string;
  amount?: string;
};

const Swap = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { pathname, search } = useLocation();

  const [searchObj] = useState<SwapSearchObj>(query2obj(search));

  const [chain, setChain] = useState(searchObj?.chain_enum || CHAINS_ENUM.ETH);
  const [payToken, setPayToken] = useState<TokenItem>({
    id: 'eth',
    chain: 'eth',
    name: 'ETH',
    symbol: 'ETH',
    display_symbol: null,
    optimized_symbol: 'ETH',
    decimals: 18,
    logo_url:
      'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d59a99717a24f2540b5.png',
    price: 0,
    is_verified: true,
    is_core: true,
    is_wallet: true,
    time_at: 0,
    amount: 0,
  });

  const [receiveToken, setReceiveToken] = useState<TokenItem | undefined>(
    undefined
  );

  const payTokenIsNativeToken =
    payToken.id === CHAINS[chain].nativeTokenAddress;

  const receiveTokenIsNativeToken =
    !!receiveToken && receiveToken.id === CHAINS[chain].nativeTokenAddress;

  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceWarn, setBalanceWarn] = useState<string | null>(null);

  const [amountInput, setAmountInput] = useState(searchObj?.amount || '');

  useMemo(() => {
    if (payToken?.raw_amount_hex_str) {
      const v = new BigNumber(payToken.raw_amount_hex_str || 0).div(
        10 ** payToken.decimals
      );
      if (v.lt(amountInput || 0)) {
        setBalanceError(t('Insufficient balance'));
      } else if (
        payTokenIsNativeToken &&
        v
          .minus(amountInput || 0)
          .minus(ReservedGas)
          .lt(0)
      ) {
        setBalanceError(t('Insufficient balance for gas'));
      } else {
        setBalanceError(null);
      }
    }
    return Number(amountInput) || 0;
  }, [amountInput, payToken?.raw_amount_hex_str]);

  const [slippage, setSlippage] = useState<typeof SLIPPAGE[number] | 'custom'>(
    searchObj?.slippage
      ? SLIPPAGE.includes(
          Number(searchObj?.slippage) as typeof SLIPPAGE[number]
        )
        ? (Number(searchObj?.slippage) as typeof SLIPPAGE[number])
        : 'custom'
      : 3
  );
  const [customSlippageInput, setCustomSlippageInput] = useState(
    searchObj?.slippage || ''
  );

  const [slippageWarning, setSlippageWaring] = useState('');
  const [slippageError, setSlippageError] = useState('');

  const [openAdvancedSetting, setOpenAdvancedSetting] = useState(false);

  const wallet = useWalletOld();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const shouldSetPageStateCache = useRef(true);
  const [autoFocusAmount, setAutoFocusAmount] = useState(true);

  const canSubmit =
    payToken &&
    receiveToken &&
    Number(amountInput) > 0 &&
    new BigNumber(payToken.raw_amount_hex_str || 0)
      .div(10 ** payToken.decimals)
      .gte(amountInput);

  const handleTransform = () => {
    if (payToken && receiveToken) {
      setPayToken(receiveToken);
      setReceiveToken(payToken);
      setAmountInput('');
    }
  };

  const getQuotes = async () => {
    await setPageStateCache();
    history.push(
      `/swap-quotes?${obj2query({
        chain_enum: chain,
        chain: payToken.chain,
        payTokenId: payToken.id,
        receiveTokenId: receiveToken!.id,
        amount: amountInput,
        rawAmount: new BigNumber(amountInput)
          .times(10 ** payToken.decimals)
          .toString(),
        slippage: slippage === 'custom' ? customSlippageInput : slippage + '',
      })}`
    );
  };

  const handleCurrentTokenChange = async (token: TokenItem) => {
    setPayToken(token);
    setAmountInput('');
    setBalanceError(null);
    setBalanceWarn(null);
    setIsLoading(true);
    const account = await wallet.syncGetCurrentAccount();
    loadCurrentToken(token.id, token.chain, account!.address);
  };

  const handleSwapTokenChange = (token: TokenItem) => {
    setReceiveToken(token);
  };

  const handleClickTokenBalance = async () => {
    const tokenBalance = new BigNumber(payToken.raw_amount_hex_str || 0).div(
      10 ** payToken.decimals
    );
    setAmountInput(tokenBalance.toString());
  };

  const handleChainChanged = async (val: CHAINS_ENUM) => {
    const account = await wallet.syncGetCurrentAccount();
    const chain = CHAINS[val];
    setChain(val);
    setPayToken({
      id: chain.nativeTokenAddress,
      decimals: chain.nativeTokenDecimals,
      logo_url: chain.nativeTokenLogo,
      symbol: chain.nativeTokenSymbol,
      display_symbol: chain.nativeTokenSymbol,
      optimized_symbol: chain.nativeTokenSymbol,
      is_core: true,
      is_verified: true,
      is_wallet: true,
      amount: 0,
      price: 0,
      name: chain.nativeTokenSymbol,
      chain: chain.serverId,
      time_at: 0,
    });
    loadCurrentToken(
      chain.nativeTokenAddress,
      chain.serverId,
      account!.address
    );
    setReceiveToken(undefined);
    setAmountInput('');
  };

  const handleClickBack = () => {
    shouldSetPageStateCache.current = false;
    history.replace('/');
  };

  const loadCurrentToken = async (
    id: string,
    chainId: string,
    address: string
  ) => {
    const t = await wallet.openapi.getToken(address, chainId, id);
    setPayToken(t);
    setIsLoading(false);
  };

  const loadPayToken = async (id: string, chainId: string, address: string) => {
    const t = await wallet.openapi.getToken(address, chainId, id);
    setReceiveToken(t);
  };

  const init = async () => {
    const account = await wallet.syncGetCurrentAccount();
    if (!account) {
      history.replace('/');
      return;
    }
    setCurrentAccount(account);
    const qs = query2obj(history.location.search);

    if (qs.payTokenId && qs.chain) {
      const id = qs.payTokenId;
      const tokenChain = qs.chain;

      const target = Object.values(CHAINS).find(
        (item) => item.serverId === tokenChain
      );
      if (!target) {
        loadCurrentToken(payToken.id, payToken.chain, account.address);
        return;
      }
      setChain(target.enum);
      loadCurrentToken(id, tokenChain, account.address);
    } else {
      const lastTimeToken = await wallet.getLastTimeSendToken(account.address);
      if (lastTimeToken) setPayToken(lastTimeToken);
      let needLoadToken: TokenItem = lastTimeToken || payToken;
      if (await wallet.hasPageStateCache()) {
        const cache = await wallet.getPageStateCache();
        if (cache?.path === pathname) {
          if (cache.states.currentToken) {
            setPayToken(cache.states.currentToken);
            needLoadToken = cache.states.currentToken;
          }
        }
      }
      if (needLoadToken.chain !== CHAINS[chain].serverId) {
        const target = Object.values(CHAINS).find(
          (item) => item.serverId === needLoadToken.chain
        )!;
        setChain(target.enum);
      }
      loadCurrentToken(needLoadToken.id, needLoadToken.chain, account.address);
    }

    if (qs.receiveTokenId && qs.chain) {
      loadPayToken(qs.receiveTokenId, qs.chain, account.address);
    }
  };

  const gotoTokenEtherscan = () => {
    const scanLink = CHAINS[chain].scanLink;
    const url = new URL(scanLink);
    openInTab(`https://${url.hostname}/token/${receiveToken?.id}`);
  };

  useEffect(() => {
    init();
  }, []);

  const [quoteErrorModal, setQuoteModal] = useState(
    !!searchObj?.fetchQuoteError
  );

  const setPageStateCache = async () => {
    if (!shouldSetPageStateCache.current) {
      wallet.clearPageStateCache();
      return;
    }
    try {
      await wallet.setLastTimeSendToken(currentAccount!.address, payToken);

      await wallet.setPageStateCache({
        path: pathname,
        search: `?${obj2query({
          chain_enum: chain,
          chain: payToken.chain,
          payTokenId: payToken.id,
          receiveTokenId: receiveToken!.id,
          amount: amountInput,
          rawAmount: new BigNumber(amountInput)
            .times(10 ** payToken.decimals)
            .toString(),
          slippage: slippage === 'custom' ? customSlippageInput : slippage + '',
        })}`,
        states: {},
      });
    } catch (error) {
      message.error(error.message);
      console.error(error);
    }
  };

  const setPageStateCacheRef = useRef(setPageStateCache);
  setPageStateCacheRef.current = setPageStateCache;

  useEffect(() => {
    return () => {
      setPageStateCacheRef.current();
    };
  }, []);

  return (
    <SwapContainer>
      <PageHeader onBack={handleClickBack} forceShowBack>
        {t('Swap')}
      </PageHeader>
      <div>
        <div
          style={{
            marginBottom: -10,
          }}
        >
          <TagChainSelector value={chain} onChange={handleChainChanged} />
        </div>

        <Section className="pb-16">
          {currentAccount && (
            <TokenAmountInput
              type="swap"
              className="px-12 py-0 h-60 flex items-center"
              token={payToken}
              onTokenChange={handleCurrentTokenChange}
              chainId={CHAINS[chain].serverId}
              amountFocus={autoFocusAmount}
              inlinePrize
              value={amountInput}
              excludeTokens={receiveToken?.id ? [receiveToken?.id] : []}
              onChange={(e) => {
                const v = Number(e);
                if (!Number.isNaN(v)) {
                  setAmountInput(e);
                }
              }}
            />
          )}

          <div className="flex justify-between items-center mt-[8px]">
            <div className="flex text-12 items-center ">
              {isLoading ? (
                <Skeleton.Input active style={{ width: 100 }} />
              ) : (
                `${t('Balance')}: ${formatTokenAmount(
                  new BigNumber(payToken.raw_amount_hex_str || 0)
                    .div(10 ** payToken.decimals)
                    .toFixed(4),
                  4
                )}`
              )}
              {!payTokenIsNativeToken && payToken.amount > 0 && (
                <MaxButton onClick={handleClickTokenBalance}>MAX</MaxButton>
              )}
            </div>
            {balanceError || balanceWarn ? (
              <div className="text-red-light text-12">
                {balanceError || balanceWarn}
              </div>
            ) : null}
          </div>
          <div className="flex justify-center flex-1 mb-[16px]">
            <RotateArrow
              onClick={handleTransform}
              className={
                'text-blue-light transition-transform hover:rotate-180'
              }
            >
              <IconSwapArrowDown width={32} height={32} />
            </RotateArrow>
          </div>

          <TokenSelect
            token={receiveToken}
            onTokenChange={handleSwapTokenChange}
            chainId={CHAINS[chain].serverId}
            excludeTokens={[payToken.id]}
            type="swap"
          />
          <Space
            size={4}
            className={clsx(
              'mt-[8px] text-gray-content text-12',
              (!receiveToken || receiveTokenIsNativeToken) && 'hidden'
            )}
          >
            <span>{t('ConfirmTheTokenOn')} </span>
            <a
              className="tx-id text-gray-content underline "
              onClick={gotoTokenEtherscan}
            >
              {t('Etherscan')}
            </a>
            <Tooltip
              overlayStyle={{
                maxWidth: 360,
              }}
              overlayClassName={'rectangle swap'}
              placement="bottom"
              title={
                <div className="w-[360px]">{t('SwapCheckEtherscanToken')}</div>
              }
            >
              <IconInfo />
            </Tooltip>
          </Space>
        </Section>

        <div
          className="flex items-center justify-center m-auto cursor-pointer mt-24 mb-8"
          onClick={() => {
            setOpenAdvancedSetting((b) => !b);
          }}
        >
          <span className="mr-2">{t('AdvancedSettings')}</span>
          <div
            className={clsx({
              'rotate-180': openAdvancedSetting,
            })}
          >
            <IconTipDownArrow />
          </div>
        </div>

        <Section
          className={clsx('relative', {
            hidden: !openAdvancedSetting,
          })}
        >
          <Space size={4} className="mb-8">
            <div>{t('MaxPriceSlippage')}</div>
            <Tooltip
              overlayStyle={{
                maxWidth: 360,
              }}
              overlayClassName={'rectangle swap'}
              placement="bottom"
              title={<div className="w-[360px]">{t('SlippageTip')}</div>}
            >
              <IconInfo />
            </Tooltip>
          </Space>

          <div className="flex justify-between items-center bg-gray-bg rounded">
            {SLIPPAGE.map((e) => (
              <SlippageItem
                key={e}
                onClick={() => setSlippage(e)}
                active={e === slippage}
              >
                {e}%
              </SlippageItem>
            ))}
            <SlippageItem
              onClick={() => setSlippage('custom')}
              active={slippage === 'custom'}
              errorBorder={!!slippageError}
            >
              {slippage === 'custom' ? (
                <Input
                  autoFocus
                  bordered={false}
                  suffix={'%'}
                  className={'text-right'}
                  value={customSlippageInput}
                  onFocus={() => setAutoFocusAmount(false)}
                  onBlur={() => setAutoFocusAmount(true)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v)) {
                      setSlippageWaring('');
                      setSlippageError('');
                      if (v < 0.1) {
                        setSlippageWaring(t('LowSlippageToleranceWarn'));
                      }
                      if (v > 5 && v < 15) {
                        setSlippageWaring(t('HighSlippageToleranceWarn'));
                      }
                      if (v > 15) {
                        setSlippageError(t('HighSlippageToleranceError'));
                      }
                      setCustomSlippageInput(e.target.value);
                    }
                  }}
                />
              ) : (
                t('Custom')
              )}
            </SlippageItem>
          </div>
          {slippage === 'custom' && (slippageError || slippageWarning) && (
            <SlippageTip error={!!slippageError} warn={!!slippageWarning}>
              {slippageError || slippageWarning}
            </SlippageTip>
          )}
        </Section>

        <AbsoluteFooter>
          <Button
            disabled={!canSubmit}
            type="primary"
            size="large"
            className="w-[200px]"
            onClick={getQuotes}
          >
            {t('GetQuotes')}
          </Button>
        </AbsoluteFooter>
      </div>
      <Modal
        visible={quoteErrorModal}
        closable={false}
        bodyStyle={{
          padding: 36,
          paddingBottom: 32,
          height: 170,
        }}
      >
        <div className="flex flex-col justify-between h-full">
          <div className="text-center text-15 text-gray-title">
            {searchObj?.fetchQuoteError}
          </div>
          <Button
            style={{
              width: 168,
            }}
            type="primary"
            size="large"
            className="mx-auto"
            onClick={() => setQuoteModal(false)}
          >
            {t('OK')}
          </Button>
        </div>
      </Modal>
    </SwapContainer>
  );
};

export default Swap;
