import React, { useState, useEffect, useMemo, useRef } from 'react';
import BigNumber from 'bignumber.js';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { Skeleton, Button, Tooltip, Space, message, InputNumber } from 'antd';
import styled from 'styled-components';
import { CHAINS, CHAINS_ENUM } from 'consts';
import { Account } from 'background/service/preference';
import { openInTab, useWallet } from 'ui/utils';
import { obj2query, query2obj } from 'ui/utils/url';
import { formatTokenAmount } from 'ui/utils/number';
import { getTokenSymbol } from 'ui/utils/token';
import TokenAmountInput from 'ui/component/TokenAmountInput';
import TagChainSelector from 'ui/component/ChainSelector/tag';
import { TokenItem } from 'background/service/openapi';
import { Modal, PageHeader } from 'ui/component';
// import * as Sentry from '@sentry/browser';

import { ReactComponent as IconSwapArrowDown } from 'ui/assets/swap/arrow-down.svg';
import TokenSelect from '@/ui/component/TokenSelect';
import LessPalette from '@/ui/style/var-defs';
import clsx from 'clsx';
import { ReactComponent as IconInfo } from 'ui/assets/infoicon.svg';
import { ReactComponent as IconTipDownArrow } from 'ui/assets/swap/arrow-tips-down.svg';
import { useAsync, useCss } from 'react-use';
import stats from '@/stats';
import { useRbiSource } from '@/ui/utils/ga-event';

const ReservedGas = 0;

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
  position: relative;
  padding: 12px;
  background-color: ${LessPalette['@color-white']};
  border-radius: 6px;
  margin-bottom: 12px;
`;

const AbsoluteFooter = styled.div`
  position: absolute;
  left: 0;
  bottom: 32px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const RotateArrow = styled.div`
  cursor: pointer;
  transition: transform 0.3s;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  &:hover {
    background: #f5f6fa;
    transform: rotate(-180deg);
  }
`;

const SlippageItem = styled.div<{
  active?: boolean;
  error?: boolean;
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
  font-weight: 500;
  font-size: 13px;
  line-height: 15px;
  color: ${(props) =>
    props.active
      ? props.error
        ? LessPalette['@color-red']
        : LessPalette['@primary-color']
      : LessPalette['@color-title']};
  border-color: ${(props) =>
    props.active
      ? props.error
        ? LessPalette['@color-red']
        : LessPalette['@primary-color']
      : 'transparent'};
  & input {
    text-align: center;
    color: ${(props) =>
      props.active
        ? props.error
          ? LessPalette['@color-red']
          : LessPalette['@primary-color']
        : LessPalette['@color-title']};
  }
  & .ant-input-number-handler-wrap {
    display: none !important;
  }
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

const defaultToken = {
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
};

const Swap = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { pathname, search, state } = useLocation<{
    chain?: CHAINS_ENUM;
    payToken?: TokenItem;
    receiveToken?: TokenItem;
  }>();

  const [searchObj] = useState<SwapSearchObj>(query2obj(search));

  const [chain, setChain] = useState(
    state?.chain || searchObj?.chain_enum || CHAINS_ENUM.ETH
  );
  const [payToken, setPayToken] = useState<TokenItem>(
    state?.payToken || defaultToken
  );

  const [receiveToken, setReceiveToken] = useState<TokenItem | undefined>(
    state?.receiveToken || undefined
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
      : 1
  );
  const [customSlippageInput, setCustomSlippageInput] = useState(
    searchObj?.slippage || ''
  );

  const [slippageWarning, setSlippageWaring] = useState('');
  const [slippageError, setSlippageError] = useState('');

  const [openAdvancedSetting, setOpenAdvancedSetting] = useState(false);

  const wallet = useWallet();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const shouldSetPageStateCache = useRef(true);
  const [autoFocusAmount, setAutoFocusAmount] = useState(true);

  const { value: feeRatio, loading: feeRatioLoading } = useAsync(async () => {
    return await wallet.getSwapFeeRatio(chain);
  }, [chain, wallet]);

  const rbisource = useRbiSource();

  const handleTransform = () => {
    if (payToken && receiveToken) {
      setPayToken(receiveToken);
      setReceiveToken(payToken);
      setAmountInput('');
    }
  };

  const getQuotes = async () => {
    const account = (await wallet.syncGetCurrentAccount())!;

    await wallet.setLastSelectedSwapPayToken(account.address, payToken);

    await setPageStateCache();

    stats.report('swapQueryQuotes', {
      chainId: payToken.chain,
      slippage:
        slippage === 'custom' ? customSlippageInput || '0' : slippage + '',
      fromToken: getTokenSymbol(payToken),
      toToken: getTokenSymbol(receiveToken!),
    });

    history.replace({
      pathname: '/swap-quotes',
      search: obj2query({
        feeRatio,
        chain_enum: chain,
        chain: payToken.chain,
        payTokenId: payToken.id,
        receiveTokenId: receiveToken!.id,
        amount: new BigNumber(amountInput).toString(10),
        rawAmount: new BigNumber(amountInput)
          .times(10 ** payToken.decimals)
          .toString(10),
        slippage:
          slippage === 'custom' ? customSlippageInput || '0' : slippage + '',
        rbisource,
      }),
      state: {
        chain,
        payToken,
        receiveToken,
        amountInput,
      },
    });
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
    setAmountInput(tokenBalance.toString(10));
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
      if (target.enum !== chain) {
        setChain(target.enum);
      }
      loadCurrentToken(id, tokenChain, account.address);
    } else {
      const lastTimeToken = await wallet.getLastSelectedSwapPayToken(
        account.address
      );
      const needLoadToken: TokenItem = lastTimeToken || payToken;

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
    openInTab(`${scanLink.replace('/tx/_s_', '')}/token/${receiveToken?.id}`);
  };

  const scanHostName = useMemo(() => {
    const scanLink = CHAINS[chain].scanLink;
    const url = new URL(scanLink);
    return url.hostname;
  }, [chain]);

  const rbiSource = useRbiSource();

  useMemo(() => {
    if (rbiSource) {
      stats.report('enterSwapDescPage', {
        refer: rbiSource,
      });
    }
  }, [rbiSource]);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (slippage === 'custom') {
      setSlippageWaring('');
      setSlippageError('');

      if (customSlippageInput.trim() === '') {
        return;
      }
      const v = Number(customSlippageInput);

      if (v < 0.1) {
        setSlippageWaring(t('LowSlippageToleranceWarn'));
      }
      if (v === 0) {
        setSlippageWaring(t('Slippage cant be 0'));
      }
      if (v > 5 && v <= 15) {
        setSlippageWaring(t('HighSlippageToleranceWarn'));
      }
      if (v > 15) {
        setSlippageError(t('HighSlippageToleranceError'));
      }
    }
  }, [slippage, customSlippageInput]);

  const [quoteErrorModal, setQuoteModal] = useState(
    !!searchObj?.fetchQuoteError
  );

  const setPageStateCache = async () => {
    if (!shouldSetPageStateCache.current) {
      await wallet.clearPageStateCache();
      return;
    }
    try {
      await wallet.setPageStateCache({
        path: pathname,
        search: `?${obj2query({
          chain_enum: chain,
          chain: payToken.chain,
          payTokenId: payToken.id,
          receiveTokenId: receiveToken?.id || '',
          amount: amountInput,
          rawAmount: new BigNumber(amountInput)
            .times(10 ** payToken.decimals)
            .toString(10),
          slippage:
            slippage === 'custom' ? customSlippageInput || '0' : slippage + '',
          rbisource,
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

  const canSubmit =
    !feeRatioLoading &&
    !slippageError &&
    (slippage !== 'custom' ||
      (slippage === 'custom' &&
        customSlippageInput.trim() !== '' &&
        Number(customSlippageInput.trim()) !== 0)) &&
    payToken &&
    receiveToken &&
    Number(amountInput) > 0 &&
    new BigNumber(payToken.raw_amount_hex_str || 0)
      .div(10 ** payToken.decimals)
      .gte(amountInput);

  useEffect(() => {
    setPageStateCacheRef.current();
  }, [
    customSlippageInput,
    slippage,
    payToken,
    receiveToken,
    amountInput,
    chain,
  ]);

  useEffect(() => {
    return () => {
      setPageStateCacheRef.current();
    };
  }, []);

  const tokenScanTooltipsClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% + 12px )',
    },
  });

  const slippageTooltipsClassName = useCss({
    '& .ant-tooltip-arrow': {
      left: 'calc(50% - 58px )',
    },
  });

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
              type="swapFrom"
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
              placeholder={t('Search by Name Address')}
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
            type="swapTo"
            placeholder={t('Search by Name Address')}
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
              className="tx-id text-gray-content underline"
              onClick={gotoTokenEtherscan}
            >
              {scanHostName}
            </a>
            <Tooltip
              overlayClassName={clsx(
                'rectangle max-w-[360px] left-[20px]',
                tokenScanTooltipsClassName
              )}
              placement="bottom"
              title={t('SwapCheckEtherscanToken', {
                scan: scanHostName,
              })}
            >
              <IconInfo />
            </Tooltip>
          </Space>
        </Section>

        <Section className={clsx('relative cursor-pointer')}>
          <div
            className="flex justify-between"
            onClick={() => {
              setOpenAdvancedSetting((b) => {
                if (!b) {
                  stats.report('swapAdvancedSettingOn', {
                    chainId: CHAINS[chain].serverId,
                  });
                }
                return !b;
              });
            }}
          >
            <Space size={4}>
              <div className="text-12 text-gray-title">
                {t('Slippage tolerance')}
              </div>
              <Tooltip
                overlayClassName={clsx(
                  'rectangle max-w-[360px] left-[20px]',
                  slippageTooltipsClassName
                )}
                placement="bottom"
                title={t('SlippageTip')}
              >
                <IconInfo />
              </Tooltip>
            </Space>
            <div className="text-right text-14 font-medium flex items-center">
              {slippage !== 'custom' ? slippage : customSlippageInput} %
              <div
                className={clsx('ml-4', {
                  'rotate-180': openAdvancedSetting,
                })}
              >
                <IconTipDownArrow />
              </div>
            </div>
          </div>

          <div
            className={clsx(
              'flex justify-between items-center bg-gray-bg rounded mt-8',
              {
                hidden: !openAdvancedSetting,
              }
            )}
          >
            {SLIPPAGE.map((e) => (
              <SlippageItem
                key={e}
                onClick={(event) => {
                  event.stopPropagation();
                  setSlippage(e);
                }}
                active={e === slippage}
              >
                {e}%
              </SlippageItem>
            ))}
            <SlippageItem
              onClick={(event) => {
                event.stopPropagation();
                setSlippage('custom');
              }}
              active={slippage === 'custom'}
              error={slippage === 'custom' && !!slippageError}
            >
              {slippage === 'custom' ? (
                <InputNumber
                  autoFocus
                  bordered={false}
                  min={'0'}
                  stringMode
                  value={customSlippageInput}
                  formatter={(value) => (value ? `${value}%` : '')}
                  parser={(value) => (value ? value!.replace('%', '') : '')}
                  onFocus={(e) => {
                    setAutoFocusAmount(false);
                    e.target?.select?.();
                  }}
                  onBlur={() => {
                    setAutoFocusAmount(true);
                  }}
                  onInput={(e) => {
                    if (!e) {
                      setCustomSlippageInput(e || '');
                    }
                  }}
                  onChange={(e) => {
                    setCustomSlippageInput(e || '');
                  }}
                />
              ) : (
                t('Custom')
              )}
            </SlippageItem>
          </div>
          {slippage === 'custom' && customSlippageInput.trim() === '' && (
            <div className="text-12 mt-8 text-gray-content">
              {t('Please input the custom slippage')}
            </div>
          )}
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
          <div className="text-center text-15 text-gray-title font-medium">
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
