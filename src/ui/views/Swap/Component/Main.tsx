import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useRabbySelector } from '@/ui/store';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import TokenSelect from '@/ui/component/TokenSelect';
import { ReactComponent as IconSwapArrow } from '@/ui/assets/swap/swap-arrow.svg';
import { TokenRender } from './TokenRender';
import { useTokenPair } from '../hooks/token';
import { Alert, Button, Input, Modal, Switch } from 'antd';
import BigNumber from 'bignumber.js';
import { formatAmount, formatUsdValue, useWallet } from '@/ui/utils';
import styled from 'styled-components';
import clsx from 'clsx';
import { QuoteList } from './Quotes';
import { useQuoteVisible, useSetQuoteVisible } from '../hooks';
import { InfoCircleFilled } from '@ant-design/icons';
import { ReceiveDetails } from './ReceiveDetail';
import { Slippage } from './Slippage';
import { DEX_ENUM, DEX_SPENDER_WHITELIST } from '@rabby-wallet/rabby-swap';
import { useDispatch } from 'react-redux';
import { useRbiSource } from '@/ui/utils/ga-event';
import { useCss } from 'react-use';
import { DEX, SWAP_SUPPORT_CHAINS } from '@/constant';
import { getTokenSymbol } from '@/ui/utils/token';
import ChainSelectorInForm from '@/ui/component/ChainSelector/InForm';
import { findChainByServerID } from '@/utils/chain';
import type { SelectChainItemProps } from '@/ui/component/ChainSelector/components/SelectChainItem';
import i18n from '@/i18n';
import { Trans, useTranslation } from 'react-i18next';

const tipsClassName = clsx('text-gray-subTitle text-12 mb-4 pt-10');

const StyledInput = styled(Input)`
  background: #f5f6fa;
  border-radius: 6px;
  height: 46px;
  font-weight: 500;
  font-size: 18px;
  color: #ffffff;
  box-shadow: none;
  & > .ant-input {
    background: #f5f6fa;
    font-weight: 500;
    font-size: 18px;
  }

  &.ant-input-affix-wrapper,
  &:focus,
  &:active {
    border: 1px solid transparent;
  }
  &:hover {
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: none;
  }

  &:placeholder-shown {
    color: #707280;
  }
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

const getDisabledTips: SelectChainItemProps['disabledTips'] = (ctx) => {
  const chainItem = findChainByServerID(ctx.chain.serverId);

  if (chainItem?.isTestnet) return i18n.t('page.swap.testnet-is-not-supported');

  return i18n.t('page.swap.not-supported');
};

export const Main = () => {
  const { userAddress, unlimitedAllowance } = useRabbySelector((state) => ({
    userAddress: state.account.currentAccount?.address || '',
    unlimitedAllowance: state.swap.unlimitedAllowance || false,
  }));

  const dispatch = useDispatch();

  const setUnlimited = useCallback(
    (bool: boolean) => {
      dispatch.swap.setUnlimitedAllowance(bool);
    },
    [dispatch.swap.setUnlimitedAllowance]
  );

  const {
    chain,
    switchChain,

    payToken,
    setPayToken,
    receiveToken,
    setReceiveToken,
    exchangeToken,

    handleAmountChange,
    handleBalance,
    payAmount,
    payTokenIsNativeToken,
    isWrapToken,
    inSufficient,
    slippageChanged,
    setSlippageChanged,
    slippageState,
    slippage,
    setSlippage,

    feeRate,

    quoteLoading,
    quoteList,

    currentProvider: activeProvider,
    setActiveProvider,
    slippageValidInfo,
    expired,
  } = useTokenPair(userAddress);

  const inputRef = useRef<Input>();

  useLayoutEffect(() => {
    if ((payToken?.id, receiveToken?.id)) {
      inputRef.current?.focus();
    }
  }, [payToken?.id, receiveToken?.id]);

  const miniReceivedAmount = useMemo(() => {
    if (activeProvider?.quote?.toTokenAmount) {
      const receivedTokeAmountBn = new BigNumber(
        activeProvider?.quote?.toTokenAmount
      ).div(
        10 **
          (activeProvider?.quote?.toTokenDecimals ||
            receiveToken?.decimals ||
            1)
      );
      return formatAmount(
        receivedTokeAmountBn
          .minus(receivedTokeAmountBn.times(slippage).div(100))
          .toString(10)
      );
    }
    return '';
  }, [
    activeProvider?.quote?.toTokenAmount,
    activeProvider?.quote?.toTokenDecimals,
    receiveToken?.decimals,
    slippage,
  ]);

  const DexDisplayName = useMemo(
    () => DEX?.[activeProvider?.name as keyof typeof DEX]?.name || '',
    [activeProvider?.name]
  );

  const visible = useQuoteVisible();
  const setVisible = useSetQuoteVisible();
  const { t } = useTranslation();

  const btnText = useMemo(() => {
    if (slippageChanged) {
      return t('page.swap.slippage-adjusted-refresh-quote');
    }
    if (activeProvider && expired) {
      return t('page.swap.price-expired-refresh-quote');
    }
    if (activeProvider?.shouldApproveToken) {
      return t('page.swap.approve-x-symbol', {
        symbol: getTokenSymbol(payToken),
      });
    }
    if (activeProvider?.name) {
      return t('page.swap.swap-via-x', {
        name: isWrapToken ? 'Wrap Contract' : DexDisplayName,
      });
    }

    return t('page.swap.get-quotes');
  }, [
    slippageChanged,
    activeProvider,
    expired,
    payToken,
    isWrapToken,
    DexDisplayName,
  ]);

  const wallet = useWallet();
  const rbiSource = useRbiSource();

  const gotoSwap = useCallback(async () => {
    if (!inSufficient && payToken && receiveToken && activeProvider?.quote) {
      try {
        wallet.dexSwap(
          {
            chain,
            quote: activeProvider?.quote,
            needApprove: activeProvider.shouldApproveToken,
            spender:
              activeProvider?.name === DEX_ENUM.WRAPTOKEN
                ? ''
                : DEX_SPENDER_WHITELIST[activeProvider.name][chain],
            pay_token_id: payToken.id,
            unlimited: unlimitedAllowance,
            shouldTwoStepApprove: activeProvider.shouldTwoStepApprove,
            postSwapParams: {
              quote: {
                pay_token_id: payToken.id,
                pay_token_amount: Number(payAmount),
                receive_token_id: receiveToken!.id,
                receive_token_amount: new BigNumber(
                  activeProvider?.quote.toTokenAmount
                )
                  .div(
                    10 **
                      (activeProvider?.quote.toTokenDecimals ||
                        receiveToken.decimals)
                  )
                  .toNumber(),
                slippage: new BigNumber(slippage).div(100).toNumber(),
              },
              dex_id: activeProvider?.name.replace('API', ''),
            },
          },
          {
            ga: {
              category: 'Swap',
              source: 'swap',
              trigger: rbiSource,
            },
          }
        );
        window.close();
      } catch (error) {
        console.error(error);
      }
    }
  }, [
    inSufficient,
    payToken,
    unlimitedAllowance,
    activeProvider?.quote,
    wallet?.dexSwap,
    activeProvider?.shouldApproveToken,
    activeProvider?.name,
    activeProvider?.shouldTwoStepApprove,
  ]);

  const twoStepApproveCn = useCss({
    '& .ant-modal-content': {
      background: '#fff',
    },
    '& .ant-modal-body': {
      padding: '12px 8px 32px 16px',
    },
    '& .ant-modal-confirm-content': {
      padding: '4px 0 0 0',
    },
    '& .ant-modal-confirm-btns': {
      justifyContent: 'center',
      '.ant-btn-primary': {
        width: '260px',
        height: '40px',
      },
      'button:first-child': {
        display: 'none',
      },
    },
  });

  return (
    <div
      className={clsx(
        'flex-1 overflow-auto',
        isWrapToken
          ? ''
          : activeProvider?.shouldApproveToken
          ? 'pb-[130px]'
          : 'pb-[110px]'
      )}
    >
      <div className={clsx('bg-white rounded-[6px] p-12 pt-0 pb-10 mx-20')}>
        <div className={clsx(tipsClassName)}>{t('page.swap.chain')}</div>
        <ChainSelectorInForm
          value={chain}
          onChange={switchChain}
          disabledTips={getDisabledTips}
          supportChains={SWAP_SUPPORT_CHAINS}
        />

        <div className={clsx(tipsClassName, 'flex items-center mb-12')}>
          <span>{t('page.swap.swap-from')}</span>
          <span className="ml-[128px]">{t('page.swap.to')}</span>
        </div>

        <div className="flex items-center justify-between">
          <TokenSelect
            token={payToken}
            onTokenChange={(token) => {
              const chainItem = findChainByServerID(token.chain);
              if (chainItem?.enum !== chain) {
                switchChain(chainItem?.enum || CHAINS_ENUM.ETH);
                setReceiveToken(undefined);
              }
              setPayToken(token);
            }}
            chainId={CHAINS[chain].serverId}
            type={'swapFrom'}
            placeholder={t('page.swap.search-by-name-address')}
            excludeTokens={receiveToken?.id ? [receiveToken?.id] : undefined}
            tokenRender={(p) => <TokenRender {...p} />}
          />
          <IconSwapArrow
            className="text-gray-content text-opacity-60 hover:text-opacity-100 cursor-pointer"
            onClick={exchangeToken}
          />
          <TokenSelect
            token={receiveToken}
            onTokenChange={(token) => {
              const chainItem = findChainByServerID(token.chain);
              if (chainItem?.enum !== chain) {
                switchChain(chainItem?.enum || CHAINS_ENUM.ETH);
                setPayToken(undefined);
              }
              setReceiveToken(token);
            }}
            chainId={CHAINS[chain].serverId}
            type={'swapTo'}
            placeholder={t('page.swap.search-by-name-address')}
            excludeTokens={payToken?.id ? [payToken?.id] : undefined}
            tokenRender={(p) => <TokenRender {...p} />}
            useSwapTokenList
          />
        </div>

        <div
          className={clsx(tipsClassName, 'flex items-center justify-between')}
        >
          <div>
            {t('page.swap.amount-in')}{' '}
            {payToken ? getTokenSymbol(payToken) : ''}
          </div>
          <div
            className={clsx(
              'text-gray-title',
              !payTokenIsNativeToken && 'underline cursor-pointer'
            )}
            onClick={() => {
              if (!payTokenIsNativeToken) {
                handleBalance();
              }
            }}
          >
            Balance: {formatAmount(payToken?.amount || 0)}
          </div>
        </div>
        <StyledInput
          spellCheck={false}
          placeholder="0"
          value={payAmount}
          onChange={handleAmountChange}
          ref={inputRef as any}
          suffix={
            <span className="text-gray-content text-12">
              {payAmount
                ? `≈ ${formatUsdValue(
                    new BigNumber(payAmount)
                      .times(payToken?.price || 0)
                      .toString(10)
                  )}`
                : ''}
            </span>
          }
        />

        {payAmount &&
          activeProvider &&
          activeProvider?.quote?.toTokenAmount &&
          payToken &&
          receiveToken && (
            <>
              <ReceiveDetails
                activeProvider={activeProvider}
                isWrapToken={isWrapToken}
                className="section"
                payAmount={payAmount}
                receiveRawAmount={activeProvider?.actualReceiveAmount}
                payToken={payToken}
                receiveToken={receiveToken}
                quoteWarning={activeProvider?.quoteWarning}
                // loading={receiveSlippageLoading}
              />
              {isWrapToken ? (
                <div className="mt-12 text-13 text-gray-subTitle">
                  {t('page.swap.there-is-no-fee-and-slippage-for-this-trade')}
                </div>
              ) : (
                <div className="section text-13 leading-4 text-gray-subTitle mt-12">
                  <div className="subText flex flex-col gap-12">
                    <Slippage
                      displaySlippage={slippage}
                      value={slippageState}
                      onChange={(e) => {
                        setSlippageChanged(true);
                        setSlippage(e);
                      }}
                      recommendValue={
                        slippageValidInfo?.is_valid
                          ? undefined
                          : slippageValidInfo?.suggest_slippage
                      }
                    />
                    <div className="flex justify-between">
                      <span>{t('page.swap.minimum-received')}</span>
                      <span className="font-medium text-gray-title">
                        {miniReceivedAmount}{' '}
                        {receiveToken ? getTokenSymbol(receiveToken) : ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('page.swap.rabby-fee')}</span>
                      <span className="font-medium text-gray-title">0%</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
      </div>

      {inSufficient ? (
        <Alert
          className={clsx(
            'mx-[20px]  rounded-[4px] px-0 py-[3px] bg-transparent mt-6'
          )}
          icon={
            <InfoCircleFilled
              className={clsx(
                'pb-[4px] self-start transform rotate-180 origin-center',
                inSufficient ? 'text-red-forbidden' : 'text-orange'
              )}
            />
          }
          banner
          message={
            <span
              className={clsx(
                'text-13 leading-[16px]',
                inSufficient ? 'text-red-forbidden' : 'text-orange'
              )}
            >
              {t('page.swap.insufficient-balance')}
            </span>
          }
        />
      ) : null}

      <div
        className={clsx(
          'fixed w-full bottom-0 mt-auto flex flex-col items-center justify-center p-20 gap-12',
          'bg-white border border-gray-divider',
          activeProvider && activeProvider.shouldApproveToken && 'pt-16'
        )}
      >
        {!expired && activeProvider && activeProvider.shouldApproveToken && (
          <div className="flex items-center justify-between w-full self-start">
            <div className="tips">
              <Trans
                i18key="page.swap.approve-tips"
                values={{
                  swap: t('page.swap.title'),
                }}
                components={[<span className="swapTips">→ 2.Swap</span>]}
              ></Trans>
            </div>
            <div
              className={clsx(
                'allowance',
                unlimitedAllowance && 'text-gray-subTitle'
              )}
            >
              <span>{t('page.swap.unlimited-allowance')}</span>{' '}
              <Switch checked={unlimitedAllowance} onChange={setUnlimited} />
            </div>
          </div>
        )}
        <Button
          type="primary"
          block
          size="large"
          className="h-[48px] text-white text-[16px] font-medium"
          onClick={() => {
            if (!activeProvider || expired || slippageChanged) {
              setVisible(true);
              return;
            }
            if (activeProvider?.shouldTwoStepApprove) {
              return Modal.confirm({
                width: 360,
                closable: true,
                centered: true,
                className: twoStepApproveCn,
                title: null,
                content: (
                  <>
                    <div className="text-[16px] font-medium text-gray-title mb-18 text-center">
                      Sign 2 transactions to change allowance
                    </div>
                    <div className="text-13 leading-[17px]  text-gray-subTitle">
                      Token USDT requires 2 transactions to change allowance.
                      First you would need to reset allowance to zero, and only
                      then set new allowance value.
                    </div>
                  </>
                ),
                okText: 'Proceed with two step approve',
                onOk() {
                  gotoSwap();
                },
              });
            }
            gotoSwap();
          }}
          disabled={!payToken || !receiveToken || !payAmount}
        >
          {btnText}
        </Button>
      </div>
      {payToken && receiveToken && chain ? (
        <QuoteList
          list={quoteList}
          loading={quoteLoading}
          visible={visible}
          onClose={() => {
            setVisible(false);
          }}
          userAddress={userAddress}
          chain={chain}
          slippage={slippage}
          payToken={payToken}
          payAmount={payAmount}
          receiveToken={receiveToken}
          fee={feeRate}
          inSufficient={inSufficient}
          setActiveProvider={setActiveProvider}
        />
      ) : null}
    </div>
  );
};
