import { PageHeader } from '@/ui/component';
import { useRabbySelector } from '@/ui/store';
import React, { useEffect, useMemo, useState } from 'react';
import { useAsync, useAsyncFn, useDebounce, useToggle } from 'react-use';
import { DEX, DexSelectDrawer } from './component/DexSelect';
import { ReactComponent as IconSwitchDex } from '@/ui/assets/swap/switch.svg';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { SwapChainSelector } from '@/ui/component/ChainSelector/tag';
import { GasLevel, TokenItem, Tx } from '@/background/service/openapi';
import TokenSelect from '@/ui/component/TokenSelect';
import styled from 'styled-components';
import ButtonMax from 'ui/assets/send-token/max.svg';
import clsx from 'clsx';
import {
  DEX_ENUM,
  DEX_ROUTER_WHITELIST,
  getQuote,
  WrapTokenAddressMap,
} from '@rabby-wallet/rabby-swap';

import { ReactComponent as IconSwitchToken } from '@/ui/assets/swap/switch-token.svg';
import { ReactComponent as IconLoading } from '@/ui/assets/swap/loading.svg';
import BigNumber from 'bignumber.js';
import { splitNumberByStep, useWallet } from '@/ui/utils';
import { Alert, Button, Skeleton, Switch } from 'antd';
import { InfoCircleFilled } from '@ant-design/icons';
import { Slippage } from './component/Slippage';
import { GasSelector } from './component/GasSelector';
import { Fee, FeeProps } from './component/Fee';
import { useVerifySdk } from './hooks';

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

const tips = {
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
  priceDifference: {
    label:
      'The price difference is higher than 5%, which may cause a great loss',
    level: 'warning',
  },
  gasCostFail: {
    label: 'Fail to estimate gas cost',
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
  const oDexId = useRabbySelector((state) => state.preference.swapDexId);

  const [dexId, setDexId] = useState(() => oDexId);
  const userAddress = useRabbySelector(
    (state) => state.account.currentAccount?.address || ''
  );
  const wallet = useWallet();

  const [visible, toggleVisible] = useToggle(false);

  const [chain, setChain] = useState(CHAINS_ENUM.ETH);

  const [payAmount, setAmount] = useState('');
  const [feeRate, setFeeRate] = useState<FeeProps['fee']>('0.3');
  const [slippage, setSlippage] = useState('0.5');
  const [gasLevel, setGasLevel] = useState<GasLevel>(defaultGasFee);

  const [payToken, setPayToken] = useState<TokenItem | undefined>(defaultToken);
  const [receiveToken, setReceiveToken] = useState<TokenItem | undefined>(
    undefined
  );

  const payTokenIsNativeToken = useMemo(
    () => payToken?.id === CHAINS[chain].nativeTokenAddress,
    [payToken?.id, chain]
  );

  console.log('gasLevel', gasLevel);

  const isWrapToken = useMemo(() => {
    if (payToken?.id && receiveToken?.id) {
      const wrapTokens = [
        WrapTokenAddressMap[chain],
        CHAINS[chain].nativeTokenAddress,
      ];

      const res =
        wrapTokens.includes(payToken?.id) &&
        wrapTokens.includes(receiveToken?.id);
      setDexId(res ? DEX_ENUM.WRAPTOKEN : oDexId);
      return res;
    }
    setDexId(oDexId);
    return false;
  }, [payToken?.id, receiveToken?.id, chain]);

  const [logo, name] = useMemo(() => {
    if (oDexId) {
      return [DEX[oDexId].logo, DEX[oDexId].name];
    }
    return ['', ''];
  }, [oDexId]);

  console.log(
    userAddress,
    dexId,
    oDexId,
    chain,
    payAmount,
    payToken?.id,
    payToken?.decimals,
    receiveToken?.id,
    feeRate
  );

  const { value: gasMarket } = useAsync(() =>
    wallet.openapi.gasMarket(CHAINS[chain].serverId)
  );

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
  }, [chain, payToken?.id, payToken?.time_at]);

  const [{ value: quoteInfo, loading }, fetchQuote] = useAsyncFn(async () => {
    if (
      !userAddress ||
      !dexId ||
      !chain ||
      !payToken?.id ||
      !payToken?.decimals ||
      !receiveToken?.id ||
      !payAmount ||
      !feeRate
    ) {
      return;
    }
    return getQuote(dexId, {
      fromToken: payToken.id,
      toToken: receiveToken.id,
      feeAddress,
      fromTokenDecimals: payToken.decimals,
      amount: new BigNumber(payAmount)
        .times(10 ** payToken.decimals)
        .toFixed(0),
      userAddress,
      slippage: Number(slippage),
      feeRate: Number(feeRate) || 0,
      chain: chain,
    });
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
  ]);

  const { value: preExcelInfo, error } = useAsync(async () => {
    if (chain && quoteInfo) {
      const nonce = await wallet.getRecommendNonce({
        from: quoteInfo.tx.from,
        chainId: CHAINS[chain].id,
      });
      const d = await wallet.openapi.preExecTx({
        tx: {
          ...quoteInfo.tx,
          nonce,
          chainId: CHAINS[chain].id,
          value: `0x${new BigNumber(quoteInfo.tx.value).toString(16)}`,
          gas: '',
        } as Tx,
        origin: '',
        address: userAddress,
        updateNonce: true,
        pending_tx_list: [],
        // value: `0x${new BigNumber(quoteInfo.tx.value).toString(16)}`,
      });
      return d;
    }
    return;
  }, [chain, quoteInfo]);

  console.log({ dexId, quoteInfo, preExcelInfo, error });

  const {
    routerPass,
    spenderPass,
    callDataPass,
    isSdkDataPass,
    tokenLoading,
    tokenPass,
    payTokenPass,
    receiveTokenPass,

    allowance,
  } = useVerifySdk({
    chain,
    dexId,
    slippage,
    data: quoteInfo,
    payToken,
    receiveToken,
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
        .div(
          10 ** (quoteInfo?.toTokenDecimals || receiveToken?.decimals || 20)
        );

      return [v.toFixed(2), v];
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
        `${splitNumberByStep(v.toFixed(2))}(${v
          .minus(payTokenUsdBn)
          .div(payTokenUsdBn)
          .times(100)
          .toFixed(2)}%)`,
        isHighPriceDifference,
      ];
    }
    return ['', 0];
  }, [receivedTokeAmountBn, payToken, payAmount]);

  const isInsufficient = useMemo(() => {
    if (payAmount && payToken?.amount) {
      return new BigNumber(payAmount).gt(payToken?.amount);
    }
    return false;
  }, [payAmount, payToken?.amount]);

  const isStableCoin = useMemo(() => {
    if (payToken?.price && receiveToken?.price) {
      return (
        new BigNumber(payToken?.price).minus(1).div(1).abs().lte(0.05) &&
        new BigNumber(receiveToken?.price).minus(1).div(1).abs().lte(0.05)
      );
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
  ]);

  const handleChain = (c: CHAINS_ENUM) => {
    setChain(c);
    const chainInfo = CHAINS[c];

    setPayToken({
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
    });
    setReceiveToken(undefined);
  };

  const handleMax = () => {
    setAmount((payToken?.amount ?? '') + '');
  };

  const switchToken = () => {
    setPayToken(receiveToken);
    setReceiveToken(payToken);
  };

  // 1.token
  // 2. 余额足够
  // 3.不是loading 状态
  // 4. 报价
  // 5.token pass
  // 6.sdk  secure pass

  const canSubmit =
    payToken &&
    receiveToken &&
    chain &&
    payAmount &&
    !isInsufficient &&
    !tokenLoading &&
    tokenPass &&
    !loading &&
    quoteInfo &&
    isSdkDataPass;

  console.log({
    payToken,
    receiveToken,
    payAmount,
    chain,
    isInsufficient,
    isHighPriceDifference,
    isSdkDataPass,
  });

  const tipsDisplay = useMemo(() => {
    if (isInsufficient) {
      return tips.insufficient;
    }
    if (payToken && payAmount && receiveToken && !loading && !quoteInfo) {
      if (!loading && !quoteInfo) {
        return tips.quoteFail;
      }

      if (!tokenLoading && !payTokenPass) {
        return tips.payTokenFail;
      }

      if (!tokenLoading && !receiveTokenPass) {
        return tips.receivingTokenFail;
      }

      if (isHighPriceDifference) {
        return tips.priceDifference;
      }
      //TODO
      //gasCostFail
      //   if(){
      //   }
      if (
        quoteInfo &&
        (payToken.price === undefined || receiveToken.price === undefined)
      ) {
        return tips.priceFail;
      }

      if (Number(slippage) >= 10) {
        return tips.highSlippage;
      }
      if (Number(slippage) <= 0.5) {
        return tips.lowSlippage;
      }
    }

    return;
  }, [
    isInsufficient,
    payToken,
    payAmount,
    receiveToken,
    loading,
    quoteInfo,
    tokenLoading,
    payTokenPass,
    receiveTokenPass,
    isHighPriceDifference,
    slippage,
  ]);

  const [unlimited, setUnlimited] = useToggle(false);

  const handleSwap = () => {
    if (payToken && oDexId && dexId && chain && quoteInfo) {
      wallet.dexSwap({
        chain,
        quote: quoteInfo,
        needApprove: !allowance,
        spender: DEX_ROUTER_WHITELIST[oDexId][chain],
        pay_token_id: payToken.id,
        unlimited,
      });
    }
  };

  useEffect(() => {
    if (isWrapToken) {
      setFeeRate('0');
    } else if (isStableCoin) {
      setFeeRate('0.1');
    } else {
      setFeeRate('0.3');
    }
  }, [isWrapToken, isStableCoin]);

  useEffect(() => {
    return cancel;
  }, []);

  if (!dexId) {
    return (
      <div className="bg-gray-bg h-full">
        <DexSelectDrawer visible={true} onClose={() => toggleVisible(false)} />
      </div>
    );
  }

  return (
    <div className="px-0 overflow-hidden bg-gray-bg h-full relative">
      <PageHeader className="pt-[24px] mx-[20px]">
        <div className="flex items-center justify-center">
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

      <div className="mx-20 bg-white w-[360px] rounded-[6px] px-12 pt-16 pb-12">
        <div className="flex items-center justify-between">
          <SwapChainSelector value={chain} onChange={handleChain} />
          {/* <IconLoading className=" text-blue-light" /> */}
        </div>
        <div className="relative flex flex-col gap-8 mt-12 mb-16">
          <SwapTokenWrapper>
            <div className="text-left w-full">Pay with</div>
            <TokenSelect
              value={payAmount}
              token={payToken}
              onTokenChange={setPayToken}
              chainId={CHAINS[chain].serverId}
              type={'swapFrom'}
              placeholder={'Search by Name / Address'}
              onChange={setAmount}
              excludeTokens={receiveToken?.id ? [receiveToken?.id] : undefined}
            />
            <div className={clsx('w-full flex justify-between items-center')}>
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
                  className={clsx('flex items-center', !payToken && 'hidden')}
                >
                  Balance:{' '}
                  {splitNumberByStep((payToken?.amount || 0).toFixed(2))}
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
            <div className="text-left w-full">Receive</div>
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
            <div className={clsx('w-full flex justify-between items-center')}>
              <div className={clsx(!receiveToken && 'hidden')}>
                Balance:
                {splitNumberByStep((receiveToken?.amount || 0).toFixed(2))}
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

          <IconSwitchToken
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            onClick={switchToken}
          />
        </div>
        <div className="flex flex-col gap-16">
          <Slippage
            value={slippage}
            onChange={setSlippage}
            amount={
              quoteInfo?.toTokenAmount
                ? receivedTokeAmountBn
                    .minus(receivedTokeAmountBn.times(feeRate).div(100))
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
              gasAmount={preExcelInfo?.gas?.gas_used}
            />
          )}

          <Fee fee={feeRate} />
        </div>
      </div>

      {!!tipsDisplay && (
        <Alert
          className={clsx(
            'mx-[16px]  rounded-[4px] px-[8px] py-[3px] bg-transparent'
          )}
          icon={
            <InfoCircleFilled
              className={clsx(
                'pb-[4px] self-start transform rotate-180 origin-center',
                tipsDisplay.level === 'danger'
                  ? 'text-red-light'
                  : 'text-orange'
              )}
            />
          }
          banner
          message={
            <span
              className={clsx(
                'text-12',
                tipsDisplay.level === 'danger'
                  ? 'text-red-light'
                  : 'text-orange'
              )}
            >
              {tipsDisplay.label}
            </span>
          }
          //   type={tipsDisplay.level}
        />
      )}

      <DexSelectDrawer visible={visible} onClose={() => toggleVisible(false)} />

      <FooterWrapper>
        {!allowance && (
          <div className="flex items-center justify-between">
            <div className="tips">
              1.Approve <span className="swapTips">→ 2.Swap</span>
            </div>
            <div className="allowance">
              <span>Unlimited allowance</span>{' '}
              <Switch checked={unlimited} onChange={setUnlimited} />
            </div>
          </div>
        )}
        <Button
          size="large"
          type="primary"
          className="mb-25 w-[360px]"
          onClick={handleSwap}
          disabled={!canSubmit}
        >
          {!allowance ? `Approve ${payToken?.symbol}` : 'swap'}
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
  gap: 4px;

  padding: 12px;
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
`;
