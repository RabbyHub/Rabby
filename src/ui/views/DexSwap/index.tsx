import { PageHeader } from '@/ui/component';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import React, { useEffect, useMemo, useState } from 'react';
import {
  useAsync,
  useAsyncFn,
  useCss,
  useDebounce,
  useToggle,
} from 'react-use';
import { DEX, DexSelectDrawer } from './component/DexSelect';
import { ReactComponent as IconSwitchDex } from '@/ui/assets/swap/switch.svg';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { SwapChainSelector } from '@/ui/component/ChainSelector/tag';
import { GasLevel, TokenItem } from '@/background/service/openapi';
import TokenSelect from '@/ui/component/TokenSelect';
import styled from 'styled-components';
import ButtonMax from 'ui/assets/send-token/max.svg';
import clsx from 'clsx';
import {
  DEX_ENUM,
  DEX_SPENDER_WHITELIST,
  getQuote,
  WrapTokenAddressMap,
} from '@rabby-wallet/rabby-swap';

import { ReactComponent as IconLoading } from '@/ui/assets/swap/loading.svg';
import { ReactComponent as IconSwitchToken } from '@/ui/assets/swap/switch-token.svg';
import BigNumber from 'bignumber.js';
import {
  splitNumberByStep,
  useWallet,
  isSameAddress,
  formatTokenAmount,
} from '@/ui/utils';
import { Alert, Button, message, Modal, Skeleton, Switch } from 'antd';
import { InfoCircleFilled } from '@ant-design/icons';
import { Slippage } from './component/Slippage';
import { GasSelector } from './component/GasSelector';
import { Fee, FeeProps } from './component/Fee';
import { useGasAmount, useVerifySdk } from './hooks';
import { IconRefresh } from './component/IconRefresh';
import { useLocation } from 'react-router-dom';
import { query2obj } from '@/ui/utils/url';
import { useRbiSource } from '@/ui/utils/ga-event';
import stats from '@/stats';

const { confirm } = Modal;

const getChainDefaultToken = (chain: CHAINS_ENUM) => {
  const chainInfo = CHAINS[chain];
  return {
    id: chainInfo.nativeTokenAddress,
    decimals: chainInfo.nativeTokenDecimals,
    logo_url: chainInfo.nativeTokenLogo,
    symbol: chainInfo.nativeTokenSymbol,
    display_symbol: chainInfo.nativeTokenSymbol,
    optimized_symbol: chainInfo.nativeTokenSymbol,
    is_core: true,
    is_verified: true,
    is_wallet: true,
    amount: 0,
    price: 0,
    name: chainInfo.nativeTokenSymbol,
    chain: chainInfo.serverId,
    time_at: 0,
  };
};

const tips = {
  securityFail: {
    label:
      'Security verification failed, please contact us in Settings - Discord',
    level: 'danger',
  },
  insufficient: {
    label: 'Insufficient balance',
    level: 'danger',
  },
  quoteFail: {
    label: 'Fail to fetch quotes, please refresh to try again',
    level: 'danger',
  },
  payTokenFail: {
    label: 'Fail to verify the payment token',
    level: 'danger',
  },
  receivingTokenFail: {
    label: 'Fail to verify the receiving token',
    level: 'danger',
  },
  preExecTxFail: {
    label: 'The previous exchange rate has expired',
    level: 'danger',
  },
  priceDifference: {
    label:
      'The price difference is higher than 5%, which may cause a great loss',
    level: 'warning',
  },
  priceFail: {
    label:
      'Unable to acquire the USD value, thus unable to compare the price difference',
    level: 'warning',
  },
  highSlippage: {
    label: 'Transaction might be frontrun because of high slippage tolerance',
    level: 'warning',
  },
  lowSlippage: {
    label: 'Transaction might be reverted because of low slippage tolerance',
    level: 'warning',
  },
};

const feeAddress = '0x39041F1B366fE33F9A5a79dE5120F2Aee2577ebc';

const defaultGasFee = {
  base_fee: 0,
  level: 'normal',
  front_tx_count: 0,
  price: 0,
  estimated_seconds: 0,
};

export const SwapByDex = () => {
  const oDexId = useRabbySelector((state) => state.swap.selectedDex);
  const oChain = useRabbySelector(
    (state) => state.swap.selectedChain || CHAINS_ENUM.ETH
  );
  const dispatch = useRabbyDispatch();
  const { search } = useLocation();
  const [searchObj] = useState<{
    payTokenId?: string;
    chain?: string;
  }>(query2obj(search));

  const rbiSource = useRbiSource();

  useMemo(() => {
    if (rbiSource) {
      stats.report('enterSwapDescPage', {
        refer: rbiSource,
      });
    }
  }, [rbiSource]);

  const [refreshId, setRefreshId] = useState(0);

  const [dexId, setDexId] = useState(() => oDexId);
  const { userAddress, unlimitedAllowance } = useRabbySelector((state) => ({
    userAddress: state.account.currentAccount?.address || '',
    unlimitedAllowance: state.swap.unlimitedAllowance || false,
  }));

  const setUnlimited = (bool: boolean) => {
    dispatch.swap.setUnlimitedAllowance(bool);
  };
  const wallet = useWallet();

  const [visible, toggleVisible] = useToggle(false);

  const [chain, setChain] = useState(oChain);

  const [payAmount, setAmount] = useState('');
  const [feeRate, setFeeRate] = useState<FeeProps['fee']>('0.3');
  const [slippage, setSlippage] = useState('0.5');
  const [gasLevel, setGasLevel] = useState<GasLevel>(defaultGasFee);

  const [payToken, setPayToken] = useState<TokenItem | undefined>(() =>
    getChainDefaultToken(chain)
  );
  const [receiveToken, setReceiveToken] = useState<TokenItem | undefined>(
    undefined
  );

  useMemo(() => {
    if (searchObj.chain && searchObj.payTokenId) {
      const target = Object.values(CHAINS).find(
        (item) => item.serverId === searchObj.chain
      );
      if (target) {
        setChain(target?.enum);
        setPayToken({
          ...getChainDefaultToken(target?.enum),
          id: searchObj.payTokenId,
        });
      }
    }
  }, [searchObj?.chain, searchObj?.payTokenId]);

  const payTokenIsNativeToken = useMemo(
    () => payToken?.id === CHAINS[chain].nativeTokenAddress,
    [payToken?.id, chain]
  );

  const [isWrapToken, wrapTokenSymbol] = useMemo(() => {
    if (payToken?.id && receiveToken?.id) {
      const wrapTokens = [
        WrapTokenAddressMap[chain],
        CHAINS[chain].nativeTokenAddress,
      ];
      const res =
        !!wrapTokens.find((token) => isSameAddress(payToken?.id, token)) &&
        !!wrapTokens.find((token) => isSameAddress(receiveToken?.id, token));
      setDexId(res ? DEX_ENUM.WRAPTOKEN : oDexId);
      return [
        res,
        isSameAddress(payToken?.id, WrapTokenAddressMap[chain])
          ? payToken.symbol
          : receiveToken.symbol,
      ];
    }
    setDexId(oDexId);
    return [false, ''];
  }, [payToken?.id, receiveToken?.id, chain]);

  const [logo, name] = useMemo(() => {
    if (oDexId) {
      return [DEX[oDexId].logo, DEX[oDexId].name];
    }
    return ['', ''];
  }, [oDexId]);

  const { value: gasMarket } = useAsync(() => {
    return wallet.openapi.gasMarket(CHAINS[chain].serverId);
  }, [chain]);

  const {
    value: nativeToken,
    loading: nativeTokenLoading,
  } = useAsync(async () => {
    if (chain) {
      const t = await wallet.openapi.getToken(
        userAddress,
        CHAINS[chain].serverId,
        CHAINS[chain].nativeTokenAddress
      );

      return t;
    }
    return;
  }, [chain]);

  const { loading: payTokenLoading } = useAsync(async () => {
    if (payToken?.id && chain && payToken?.time_at === 0) {
      const t = await wallet.openapi.getToken(
        userAddress,
        CHAINS[chain].serverId,
        payToken?.id
      );
      setPayToken(t);
      return;
    }
    return;
  }, [chain, payToken?.id, payToken?.time_at, refreshId]);

  const [{ value: quoteInfo, loading }, fetchQuote] = useAsyncFn(async () => {
    if (
      !userAddress ||
      !dexId ||
      !chain ||
      !payToken?.id ||
      !payToken?.decimals ||
      !receiveToken?.id ||
      !payAmount ||
      !feeRate ||
      !gasMarket?.[1]?.price
    ) {
      return;
    }
    stats.report('swapRequestQuote', {
      dex: dexId,
      chain,
      fromToken: payToken.id,
      toToken: receiveToken.id,
    });
    try {
      const data = await getQuote(dexId, {
        fromToken: payToken.id,
        toToken: receiveToken.id,
        feeAddress,
        fromTokenDecimals: payToken.decimals,
        amount: new BigNumber(payAmount)
          .times(10 ** payToken.decimals)
          .toFixed(0, 1),
        userAddress,
        slippage: Number(slippage),
        feeRate: Number(feeRate) || 0,
        chain: chain,
        gasPrice: gasMarket?.[1]?.price,
      });

      stats.report('swapQuoteResult', {
        dex: dexId,
        chain,
        fromToken: payToken.id,
        toToken: receiveToken.id,
        status: data ? 'success' : 'fail',
      });

      return data;
    } catch (error) {
      stats.report('swapQuoteResult', {
        dex: dexId,
        chain,
        fromToken: payToken.id,
        toToken: receiveToken.id,
        status: 'fail',
      });
    }
  }, [
    userAddress,
    dexId,
    chain,
    payAmount,
    payToken?.id,
    payToken?.decimals,
    receiveToken?.id,
    feeRate,
    slippage,
    gasMarket?.[1]?.price,
  ]);

  const { isSdkDataPass, tokenApproved, shouldTwoStepApprove } = useVerifySdk({
    chain,
    dexId,
    slippage,
    data: quoteInfo &&
      receiveToken && {
        ...quoteInfo,
        fromToken: payToken!.id,
        fromTokenAmount: new BigNumber(payAmount)
          .times(10 ** payToken!.decimals)
          .toFixed(0, 1),
        toToken: receiveToken?.id,
      },
    payToken,
    receiveToken,
    payAmount,
  });

  const { totalGasUsed, totalGasUsedLoading, preExecTxError } = useGasAmount({
    chain,
    data: quoteInfo,
    payToken,
    receiveToken,
    dexId: oDexId,
    gasMarket,
    gasLevel,
    tokenApproved,
    shouldTwoStepApprove,
    userAddress,
    refreshId,
    payAmount,
  });

  const [payTokenUsdDisplay, payTokenUsdBn] = useMemo(() => {
    const payTokenUsd = new BigNumber(payAmount || 0).times(
      payToken?.price || 0
    );
    return [payTokenUsd.toFixed(2), payTokenUsd];
  }, [payAmount, payToken]);

  const [receivedTokeAmountDisplay, receivedTokeAmountBn] = useMemo(() => {
    let v = new BigNumber(0);
    if (quoteInfo?.toTokenAmount) {
      v = v
        .plus(quoteInfo?.toTokenAmount)
        .div(10 ** (quoteInfo?.toTokenDecimals || receiveToken?.decimals || 0));

      return [formatTokenAmount(v.toFixed(), 8), v];
    }
    return ['', v];
  }, [quoteInfo, receiveToken?.price]);

  const [receivedTokenUsd, isHighPriceDifference] = useMemo(() => {
    if (quoteInfo?.toTokenAmount) {
      const v = receivedTokeAmountBn.times(receiveToken?.price || 0);
      const isHighPriceDifference = v
        .minus(payTokenUsdBn)
        .div(payTokenUsdBn)
        .times(100)
        .lte(-5);

      return [
        `${splitNumberByStep(v.toFixed(2))} (${v
          .minus(payTokenUsdBn)
          .div(payTokenUsdBn)
          .times(100)
          .toFixed(2)}%)`,
        isHighPriceDifference,
      ];
    }
    return ['', false];
  }, [receivedTokeAmountBn, payToken, payAmount]);

  const isInsufficient = useMemo(() => {
    return new BigNumber(payAmount || 0).gt(
      new BigNumber(payToken?.raw_amount_hex_str || 0).div(
        10 ** (payToken?.decimals || 0)
      )
    );
  }, [payAmount, payToken?.amount]);

  const isStableCoin = useMemo(() => {
    if (payToken?.price && receiveToken?.price) {
      return new BigNumber(payToken?.price)
        .minus(receiveToken?.price)
        .div(payToken?.price)
        .abs()
        .lte(0.01);
    }
    return false;
  }, [payToken, receiveToken]);

  const [, cancel] = useDebounce(() => fetchQuote(), 200, [
    userAddress,
    dexId,
    chain,
    payAmount,
    payToken?.id,
    payToken?.decimals,
    receiveToken?.id,
    feeRate,
    slippage,
    refreshId,
  ]);

  const handleChain = (c: CHAINS_ENUM) => {
    setChain(c);
    dispatch.swap.setSelectedChain(c);
    resetSwapTokens(c);
  };

  const onChainChanged = async () => {
    const gasCache = await dispatch.swap.getSwapGasCache(chain);
    setGasLevel(
      gasCache
        ? {
            level:
              gasCache.lastTimeSelect === 'gasPrice'
                ? 'custom'
                : gasCache.gasLevel!,
            base_fee: 0,
            price:
              gasCache.lastTimeSelect === 'gasPrice' ? gasCache.gasPrice! : 0,
            front_tx_count: 0,
            estimated_seconds: 0,
          }
        : defaultGasFee
    );
  };

  const resetSwapTokens = (chain: CHAINS_ENUM) => {
    setPayToken(getChainDefaultToken(chain));
    setReceiveToken(undefined);
  };

  const handleMax = () => {
    setAmount(
      new BigNumber(payToken?.raw_amount_hex_str || '')
        .div(10 ** (payToken?.decimals || 0))
        .toFixed()
    );
  };

  const switchToken = () => {
    setPayToken(receiveToken);
    setReceiveToken(payToken);
  };

  const preExecTxSuccess =
    !totalGasUsedLoading && !preExecTxError && !!totalGasUsed;

  const canSubmit =
    !!payToken &&
    !!receiveToken &&
    !!chain &&
    !!payAmount &&
    !isInsufficient &&
    !loading &&
    !!quoteInfo &&
    isSdkDataPass &&
    preExecTxSuccess;

  const tipsDisplay = useMemo(() => {
    if (isInsufficient) {
      return tips.insufficient;
    }

    if (payToken && payAmount && receiveToken) {
      if (!loading && !quoteInfo) {
        return tips.quoteFail;
      }

      if (
        chain &&
        quoteInfo &&
        payToken &&
        dexId &&
        gasMarket &&
        !loading &&
        !totalGasUsedLoading &&
        (preExecTxError || totalGasUsed === undefined)
      ) {
        return tips.preExecTxFail;
      }

      if (!loading && quoteInfo && !isSdkDataPass) {
        return tips.securityFail;
      }

      if (!loading && quoteInfo && isHighPriceDifference) {
        return tips.priceDifference;
      }

      if (
        quoteInfo &&
        (payToken.price === undefined || receiveToken.price === undefined)
      ) {
        return tips.priceFail;
      }
    }

    if (Number(slippage) > 10) {
      return tips.highSlippage;
    }
    if (Number(slippage) < 0.05) {
      return tips.lowSlippage;
    }

    return;
  }, [
    isInsufficient,
    payToken,
    payAmount,
    receiveToken,
    loading,
    quoteInfo,
    isSdkDataPass,
    isHighPriceDifference,
    chain,
    dexId,
    gasMarket,
    totalGasUsedLoading,
    totalGasUsed,
    slippage,
  ]);

  const refresh = () => {
    setRefreshId((id) => ++id);
  };

  const handleUpdateGasCache = async () => {
    let price = 0;
    if (gasLevel.level === 'custom') {
      price = gasLevel.price;
    } else {
      price = (gasMarket || []).find((item) => item.level === gasLevel.level)!
        .price;
    }
    await dispatch.swap.updateSwapGasCache({
      chain,
      gas: {
        gasPrice: price,
        gasLevel: gasLevel.level,
        lastTimeSelect: gasLevel.level === 'custom' ? 'gasPrice' : 'gasLevel',
      },
    });
  };

  const gotoSwap = async () => {
    if (canSubmit && oDexId) {
      let price = 0;
      if (gasLevel.level === 'custom') {
        price = gasLevel.price;
      } else {
        price = (gasMarket || []).find((item) => item.level === gasLevel.level)!
          .price;
      }
      await handleUpdateGasCache();
      try {
        wallet.dexSwap(
          {
            chain,
            quote: quoteInfo,
            needApprove: !tokenApproved,
            spender: DEX_SPENDER_WHITELIST[oDexId][chain],
            pay_token_id: payToken.id,
            gasPrice: price,
            unlimited: unlimitedAllowance,
            shouldTwoStepApprove,
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
  };

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
  const handleSwap = async () => {
    if (payAmount && payToken && !receiveToken) {
      message.error({
        icon: (
          <InfoCircleFilled
            className={clsx(
              'pb-2 self-start transform rotate-180 origin-center text-red-light'
            )}
          />
        ),
        content: 'Please select receive token',
      });
      return;
    }
    if (tipsDisplay?.level === 'danger') {
      message.error({
        icon: (
          <InfoCircleFilled
            className={clsx(
              'pb-2 self-start transform rotate-180 origin-center text-red-light'
            )}
          />
        ),
        content: tipsDisplay.label,
      });
      return;
    }

    if (canSubmit && oDexId) {
      if (shouldTwoStepApprove) {
        return confirm({
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
                Token USDT requires 2 transactions to change allowance. First
                you would need to reset allowance to zero, and only then set new
                allowance value.
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
    }
  };

  const totalLoading =
    loading || nativeTokenLoading || payTokenLoading || totalGasUsedLoading;

  useEffect(() => {
    if (isWrapToken) {
      setFeeRate('0');
    } else if (isStableCoin) {
      setFeeRate('0.1');
    } else {
      setFeeRate('0.3');
    }

    if (isStableCoin) {
      setSlippage('0.05');
    }
  }, [isWrapToken, isStableCoin]);

  useEffect(() => {
    if (dexId !== oDexId && dexId !== DEX_ENUM.WRAPTOKEN) {
      setChain(CHAINS_ENUM.ETH);
      resetSwapTokens(CHAINS_ENUM.ETH);
      setDexId(oDexId);
      setAmount('');
    }
  }, [dexId, oDexId]);

  useEffect(() => {
    onChainChanged();
  }, [chain]);

  useEffect(() => {
    return cancel;
  }, []);

  if (!oDexId) {
    return (
      <div className="bg-gray-bg h-full">
        <DexSelectDrawer visible={true} onClose={() => toggleVisible(false)} />
      </div>
    );
  }

  return (
    <div className="px-0 overflow-hidden bg-gray-bg h-full relative pb-[120px]">
      <PageHeader className="pt-[24px] mx-[20px]">
        <div className="flex items-center justify-center gap-4">
          <img src={logo} alt="" className="w-24 h-24 rounded-full" />
          <span className="font-medium text-20 text-gray-title">{name}</span>
        </div>

        <IconSwitchDex
          className="absolute right-0 top-28 text-gray-title w-16px h-16px cursor-pointer"
          style={{
            top: 28,
          }}
          onClick={toggleVisible}
        />
      </PageHeader>
      <div className="max-h-[444px] overflow-y-auto pb-[62px]">
        <div className="mx-20 bg-white w-[360px] rounded-[6px] px-12 pt-2 pb-12">
          <div className="flex items-center justify-between h-[36px]">
            <SwapChainSelector
              value={chain}
              onChange={handleChain}
              disabledTips={'Not supported by the current exchange'}
              title={
                <div className="flex items-center gap-6">
                  <img src={logo} alt="" className="w-24 h-24 rounded-[4px]" />
                  <span>Select the chain supported by {name}</span>
                </div>
              }
            />
            {!!payAmount && !!payToken && !!receiveToken && (
              <IconRefresh
                className="text-blue-light cursor-pointer"
                refresh={refresh}
                loading={loading}
              />
            )}
          </div>
          <div className="relative flex flex-col gap-8 ">
            <SwapTokenWrapper>
              <div className="text-left w-full mb-4 pl-4">Pay with</div>
              <TokenSelect
                value={payAmount}
                token={payToken}
                onTokenChange={setPayToken}
                chainId={CHAINS[chain].serverId}
                type={'swapFrom'}
                placeholder={'Search by Name / Address'}
                onChange={setAmount}
                excludeTokens={
                  receiveToken?.id ? [receiveToken?.id] : undefined
                }
              />
              <div
                className={clsx(
                  'w-full flex justify-between items-center mt-6 pl-4'
                )}
              >
                {payTokenLoading ? (
                  <Skeleton.Input
                    style={{
                      width: 86,
                      height: 14,
                    }}
                    active
                  />
                ) : (
                  <div
                    className={clsx(
                      'flex items-center',
                      !payToken && 'hidden',
                      isInsufficient && 'text-red-forbidden'
                    )}
                  >
                    Balance:{' '}
                    {splitNumberByStep(
                      new BigNumber(payToken?.amount || 0).toFixed(4, 1)
                    )}
                    {payToken && !payTokenIsNativeToken && (
                      <img
                        className="ml-6 select-none cursor-pointer"
                        src={ButtonMax}
                        onClick={handleMax}
                      />
                    )}
                  </div>
                )}
                {payTokenLoading ? (
                  <Skeleton.Input
                    style={{
                      width: 86,
                      height: 14,
                    }}
                    active
                  />
                ) : (
                  <div className={clsx((!payToken || !payAmount) && 'hidden')}>
                    ${splitNumberByStep(payTokenUsdDisplay)}
                  </div>
                )}
              </div>
            </SwapTokenWrapper>
            <SwapTokenWrapper>
              <div className="text-left w-full mb-4 pl-4">Receive</div>
              <TokenSelect
                token={receiveToken}
                onTokenChange={setReceiveToken}
                chainId={CHAINS[chain].serverId}
                type={'swapTo'}
                placeholder={'Search by Name / Address'}
                excludeTokens={payToken?.id ? [payToken?.id] : undefined}
                value={receivedTokeAmountDisplay}
                loading={loading}
              />
              <div
                className={clsx(
                  'w-full flex justify-between items-center mt-6 pl-4'
                )}
              >
                <div className={clsx(!receiveToken && 'hidden')}>
                  Balance:
                  {splitNumberByStep((receiveToken?.amount || 0).toFixed(4))}
                </div>

                {loading ? (
                  <Skeleton.Input
                    style={{
                      width: 86,
                      height: 14,
                    }}
                    active
                  />
                ) : (
                  <div
                    className={clsx(
                      (!receivedTokenUsd || !payAmount) && 'hidden'
                    )}
                  >
                    ${receivedTokenUsd}
                  </div>
                )}
              </div>
            </SwapTokenWrapper>
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer text-gray-bg hover:text-gray-divider"
              onClick={switchToken}
            >
              <IconSwitchToken />
            </div>
          </div>
          {payToken && receiveToken && (
            <div className="flex flex-col gap-14 mt-16 mb-8">
              <Slippage
                value={slippage}
                onChange={setSlippage}
                amount={
                  quoteInfo?.toTokenAmount
                    ? receivedTokeAmountBn
                        .minus(receivedTokeAmountBn.times(slippage).div(100))
                        .toFixed(2)
                    : ''
                }
                symbol={receiveToken?.symbol}
              />

              {nativeToken && (
                <GasSelector
                  chainId={CHAINS[chain].id}
                  onChange={function (gas: GasLevel): void {
                    setGasLevel(gas);
                  }}
                  gasList={gasMarket || []}
                  gas={gasLevel}
                  token={nativeToken}
                  gasUsed={totalGasUsed}
                />
              )}

              <Fee fee={feeRate} symbol={wrapTokenSymbol} />
            </div>
          )}
        </div>
        {!!tipsDisplay && (
          <Alert
            className={clsx(
              'mx-[20px]  rounded-[4px] px-0 py-[3px] bg-transparent mt-6'
            )}
            icon={
              <InfoCircleFilled
                className={clsx(
                  'pb-[4px] self-start transform rotate-180 origin-center',
                  tipsDisplay.level === 'danger'
                    ? 'text-red-forbidden'
                    : 'text-orange'
                )}
              />
            }
            banner
            message={
              <span
                className={clsx(
                  'text-13 leading-[16px]',
                  tipsDisplay.level === 'danger'
                    ? 'text-red-forbidden'
                    : 'text-orange'
                )}
              >
                {tipsDisplay.label}
              </span>
            }
          />
        )}
      </div>

      <DexSelectDrawer visible={visible} onClose={() => toggleVisible(false)} />

      <FooterWrapper>
        {!tokenApproved && (
          <div className="flex items-center justify-between">
            <div className="tips">
              1.Approve <span className="swapTips">→ 2.Swap</span>
            </div>
            <div
              className={clsx(
                'allowance',
                unlimitedAllowance && 'text-gray-subTitle'
              )}
            >
              <span>Unlimited allowance</span>{' '}
              <Switch checked={unlimitedAllowance} onChange={setUnlimited} />
            </div>
          </div>
        )}
        <Button
          size="large"
          type="primary"
          onClick={handleSwap}
          className={clsx((!canSubmit || totalLoading) && 'disabled')}
          icon={totalLoading ? <IconLoading className="animate-spin" /> : null}
        >
          {loading
            ? 'Fetching offer'
            : !tokenApproved
            ? `Approve ${payToken?.symbol}`
            : 'Swap'}
        </Button>
      </FooterWrapper>
    </div>
  );
};

const SwapTokenWrapper = styled.div`
  width: 336px;
  height: 92px;
  display: flex;
  flex-direction: column;
  padding: 10px 12px 12px 8px;
  background: #f5f6fa;
  border-radius: 4px;
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  color: #4b4d59;
`;

const FooterWrapper = styled.div`
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  background-color: #fff;
  border-top: 0.7px solid #e5e9ef;
  padding: 20px;
  min-height: 97px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  .tips {
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    color: #13141a;

    .swapTips {
      color: #707280;
    }
  }

  .allowance {
    display: flex;
    gap: 7px;
    font-style: normal;
    font-weight: 400;
    font-size: 12px;
    line-height: 14px;
    text-align: right;
    color: #707280;
  }

  .ant-btn-primary {
    height: 52px;
    width: 360px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }

  .ant-btn-primary.disabled {
    background-color: #b6c1ff;
    box-shadow: 0px 12px 24px rgba(134, 151, 255, 0.12);
    border-color: rgba(134, 151, 255, 0.12);
    cursor: not-allowed;
  }
`;
