import { TokenWithChain } from '@/ui/component';
import { getTokenSymbol, abstractTokenToTokenItem } from '@/ui/utils/token';
import { TokenItem, Tx } from '@rabby-wallet/rabby-api/dist/types';
import { Button, Skeleton, Switch, Tooltip } from 'antd';
import clsx from 'clsx';
import React, {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ReactComponent as IconArrowDownCC } from 'ui/assets/bridge/tiny-down-arrow-cc.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { BridgeSlippage } from './BridgeSlippage';
import { tokenPriceImpact } from '../hooks';
import imgBestQuoteSharpBg from '@/ui/assets/swap/best-quote-sharp-bg.svg';
import styled from 'styled-components';
import { findChainByServerID } from '@/utils/chain';
import BigNumber from 'bignumber.js';
import { CHAINS_ENUM } from '@debank/common';
import { intToHex, useWallet } from '@/ui/utils';
import _, { noop } from 'lodash';
import {
  shallowEqual,
  useSignatureStoreOf,
} from '@/ui/component/MiniSignV2/state';
import type { SignatureManager } from '@/ui/component/MiniSignV2/state/SignatureManager';
import {
  GasAccountTips,
  GasLessActivityToSign,
  GasLessNotEnough,
} from '../../Approval/components/FooterBar/GasLessComponents';
import {
  shouldAutoSwitchToGasAccountFromGasless,
  shouldShowGasLessNotEnough,
} from '../../Approval/components/FooterBar/gasAccountDecision';
import { useGasAccountSign } from '../../GasAccount/hooks';
import { GasAccountDepositPopup } from '../../GasAccount/components/GasAccountDepositPopup';
import {
  buildTopUpResumedTxs,
  GasAccountTopUpResult,
} from '../../GasAccount/components/topUpContinuation';
import { useGasAccountDepositFlowActive } from '../../GasAccount/hooks/runtime';
import { useMemoizedFn } from 'ahooks';
import { GasSelectorResponse } from '../../Approval/components/TxComponents/GasSelectorHeader';
import SignMainnetGasSelectorHeader from '../../Approval/components/TxComponents/GasSelector/SignMainnetGasSelectorHeader';
import { normalizeTxParams } from '../../Approval/components/SignTx';
import { checkGasAndNonce, explainGas } from '@/utils/transaction';
import { KEYRING_CLASS } from 'consts';
import { useRabbySelector } from '@/ui/store';
import {
  calcTempoMaxGasCostRawAmountIn18,
  isTempoBatchSupportedAccountType,
  isTempoChain,
  listTempoFeeTokenOptionsFromCache,
  loadTempoFeeTokenOptionsState,
  TxWithTempoExtras,
} from '@/utils/tempo';

const PreferMEVGuardSwitch = styled(Switch)`
  min-width: 20px;
  height: 12px;

  &.ant-switch-checked {
    background-color: var(--r-blue-default, #7084ff);
    .ant-switch-handle {
      left: calc(100% - 10px - 1px);
      top: 1px;
    }
  }
  .ant-switch-handle {
    height: 10px;
    width: 10px;
    top: 1px;
    left: 1px;
  }
`;

export const BridgeShowMore = ({
  openQuotesList,
  sourceName,
  sourceLogo,
  duration,
  slippage,
  displaySlippage,
  onSlippageChange,
  fromToken,
  toToken,
  amount,
  toAmount,
  quoteLoading,
  slippageError,
  autoSlippage,
  isCustomSlippage,
  setAutoSlippage,
  setIsCustomSlippage,
  open,
  setOpen,
  type,
  isWrapToken,
  isBestQuote,
  showMEVGuardedSwitch,
  originPreferMEVGuarded,
  switchPreferMEV,
  recommendValue,
  openFeePopup,
  supportDirectSign = false,
  autoSuggestSlippage,
  insufficient = false,
  signatureInstance,
}: {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  openQuotesList: () => void;
  sourceName: string;
  sourceLogo: string;
  duration?: number;
  slippage: string;
  displaySlippage: string;
  onSlippageChange: (n: string) => void;
  showLoss?: boolean;
  fromToken?: TokenItem;
  toToken?: TokenItem;
  amount?: string | number;
  toAmount?: string | number;
  quoteLoading?: boolean;
  slippageError?: boolean;
  autoSlippage: boolean;
  isCustomSlippage: boolean;
  insufficient?: boolean;
  setAutoSlippage: (boolean: boolean) => void;
  setIsCustomSlippage: (boolean: boolean) => void;
  type: 'swap' | 'bridge';
  /**
   * for swap props
   */
  isWrapToken?: boolean;
  isBestQuote: boolean;
  showMEVGuardedSwitch?: boolean;
  originPreferMEVGuarded?: boolean;
  switchPreferMEV?: (b: boolean) => void;
  recommendValue?: number;
  openFeePopup: () => void;
  autoSuggestSlippage?: string;
  supportDirectSign?: boolean;
  signatureInstance: SignatureManager;
}) => {
  const { t } = useTranslation();
  const sourceAlwaysShow = type === 'bridge';

  const RABBY_FEE = '0.25%';

  const data = useMemo(() => {
    if (quoteLoading || (!sourceLogo && !sourceName)) {
      return {
        showLoss: false,
        diff: '',
        fromUsd: '',
        toUsd: '',
        lossUsd: '',
      };
    }
    return tokenPriceImpact(fromToken, toToken, amount, toAmount);
  }, [
    fromToken,
    toToken,
    amount,
    toAmount,
    quoteLoading,
    sourceLogo,
    sourceName,
  ]);

  const bestQuoteStyle = useMemo(() => {
    if (isBestQuote) {
      return {
        backgroundImage: `url(${imgBestQuoteSharpBg})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '38px',
      };
    }
    return undefined;
  }, [isBestQuote]);

  const showSlippageError = slippageError;

  const showMinDuration = useMemo(() => {
    return Math.max(Math.round((duration || 0) / 60), 1);
  }, [duration]);

  const durationColor = useMemo(() => {
    if (showMinDuration > 10) {
      return 'text-r-red-default';
    }

    if (showMinDuration > 3) {
      return 'text-r-orange-default';
    }
    return 'text-r-blue-default';
  }, [showMinDuration]);

  const sourceContentRender = useMemoizedFn(() => {
    return (
      <ListItem
        name={
          type === 'bridge'
            ? t('page.bridge.showMore.source')
            : t('page.swap.source')
        }
        className="mb-12 h-18"
      >
        {quoteLoading ? (
          <Skeleton.Input
            active
            className="rounded"
            style={{
              width: 52,
              height: 12,
            }}
          />
        ) : (
          <div
            className="flex items-center gap-4  cursor-pointer"
            onClick={openQuotesList}
          >
            <div
              className={clsx(
                'flex items-center gap-4 cursor-pointer',
                isBestQuote &&
                  'border-[0.5px] border-solid border-rabby-blue-default rounded-[4px] pr-[5px]'
              )}
              style={bestQuoteStyle}
              // onClick={openQuotesList}
            >
              {isBestQuote ? (
                <span className="text-r-neutral-title2 text-[12px] font-medium italic py-1 pl-6 pr-8">
                  {t('page.swap.best')}
                </span>
              ) : null}
              {sourceLogo && (
                <img
                  className="w-12 h-12 rounded-full"
                  src={sourceLogo}
                  alt={sourceName}
                />
              )}
              <span className="text-12 text-rabby-blue-default font-medium">
                {sourceName}
              </span>
              {!sourceLogo && !sourceName ? (
                <span className="text-12 text-r-neutral-foot">-</span>
              ) : null}
            </div>
            {type === 'bridge' && (
              <span className={`text-12 font-medium ${durationColor}`}>
                {' · '}
                {t('page.bridge.duration', {
                  duration: showMinDuration,
                })}
              </span>
            )}
          </div>
        )}
      </ListItem>
    );
  });

  const lostValueContentRender = useCallback(() => {
    return (
      <>
        {data?.showLoss && !quoteLoading && (
          <div className="leading-4 text-12 text-r-neutral-foot">
            <div className="flex justify-between">
              <span>{t('page.bridge.price-impact')}</span>
              <span
                className={clsx(
                  'font-medium  inline-flex items-center',
                  'text-r-red-default'
                )}
              >
                -{data.diff}%
                <Tooltip
                  align={{
                    offset: [10, 0],
                  }}
                  placement={'topRight'}
                  overlayClassName="rectangle max-w-[360px]"
                  title={
                    <div className="flex flex-col gap-4 py-[5px] text-13">
                      <div>
                        {t('page.bridge.est-payment')} {amount}
                        {getTokenSymbol(fromToken)} ≈ {data.fromUsd}
                      </div>
                      <div>
                        {t('page.bridge.est-receiving')} {toAmount}
                        {getTokenSymbol(toToken)} ≈ {data.toUsd}
                      </div>
                      <div>
                        {t('page.bridge.est-difference')} {data.lossUsd}
                      </div>
                    </div>
                  }
                >
                  <RcIconInfo className="ml-4 text-rabby-neutral-foot w-14 h-14 " />
                </Tooltip>
              </span>
            </div>
            <div className="mt-[8px] rounded-[4px] border-[0.5px] border-rabby-red-default bg-r-red-light p-8 text-13 font-normal text-r-red-default">
              {t('page.bridge.loss-tips', {
                usd: data?.lossUsd,
              })}
            </div>
          </div>
        )}
      </>
    );
  }, [data, quoteLoading, toToken, fromToken]);

  return (
    <div className="mx-16">
      <div className="space-y-16">
        {sourceAlwaysShow && sourceContentRender()}

        {lostValueContentRender()}

        {!insufficient && fromToken && supportDirectSign ? (
          <DirectSignGasInfo
            supportDirectSign={supportDirectSign}
            loading={!!quoteLoading}
            openShowMore={noop}
            noQuote={!sourceLogo && !sourceName}
            chainServeId={fromToken?.chain}
            signatureInstance={signatureInstance}
          />
        ) : null}

        {showSlippageError && (
          <BridgeSlippage
            autoSuggestSlippage={autoSuggestSlippage}
            value={slippage}
            displaySlippage={displaySlippage}
            onChange={onSlippageChange}
            autoSlippage={autoSlippage}
            isCustomSlippage={isCustomSlippage}
            setAutoSlippage={setAutoSlippage}
            setIsCustomSlippage={setIsCustomSlippage}
            type={type}
            isWrapToken={isWrapToken}
            recommendValue={recommendValue}
          />
        )}
        <div />
      </div>

      <div className="flex items-center justify-center gap-8 mb-8">
        <div
          className={clsx(
            'flex items-center opacity-50',
            'cursor-pointer',
            'text-r-neutral-foot text-12'
          )}
          onClick={() => setOpen((e) => !e)}
        >
          <span>{t('page.bridge.showMore.title')}</span>
          <IconArrowDownCC
            viewBox="0 0 14 14"
            width={14}
            height={14}
            className={clsx(
              'transition-transform',
              open && 'rotate-180 translate-y-1'
            )}
          />
        </div>
      </div>

      <div className={clsx('overflow-hidden', !open && 'h-0')}>
        {!sourceAlwaysShow && sourceContentRender()}
        {!showSlippageError && (
          <BridgeSlippage
            autoSuggestSlippage={autoSuggestSlippage}
            value={slippage}
            displaySlippage={displaySlippage}
            onChange={onSlippageChange}
            autoSlippage={autoSlippage}
            isCustomSlippage={isCustomSlippage}
            setAutoSlippage={setAutoSlippage}
            setIsCustomSlippage={setIsCustomSlippage}
            type={type}
            isWrapToken={isWrapToken}
            recommendValue={recommendValue}
          />
        )}

        <ListItem name={t('page.swap.rabbyFee.title')} className="mt-12 h-18">
          <div
            className={clsx(
              'text-12 font-medium',
              isWrapToken
                ? 'text-r-neutral-foot'
                : 'text-r-blue-default cursor-pointer'
            )}
            onClick={openFeePopup}
          >
            {isWrapToken && type === 'swap'
              ? t('page.swap.no-fees-for-wrap')
              : RABBY_FEE}
          </div>
        </ListItem>

        {showMEVGuardedSwitch && type === 'swap' ? (
          <ListItem
            name={
              <Tooltip
                placement={'topLeft'}
                overlayClassName={clsx('rectangle', 'max-w-[312px]')}
                title={t('page.swap.preferMEVTip')}
              >
                <span>{t('page.swap.preferMEV')}</span>
              </Tooltip>
            }
            className="mt-12"
          >
            <Tooltip
              placement={'topRight'}
              overlayClassName={clsx('rectangle', 'max-w-[312px]')}
              title={t('page.swap.preferMEVTip')}
            >
              <PreferMEVGuardSwitch
                checked={originPreferMEVGuarded}
                onChange={switchPreferMEV}
              />
            </Tooltip>
          </ListItem>
        ) : null}
      </div>
    </div>
  );
};

const GasTipsWrapper = styled.div`
  position: relative;

  .security-level-tip {
    margin-top: 10px;
    border-radius: 4px;
    padding: 6px 10px 6px 8px;
    font-weight: 500;
    font-size: 13px;
    line-height: 15px;
    display: flex;
    position: relative;
    .icon-level {
      width: 14px;
      height: 14px;
      margin-right: 6px;
    }
  }
`;

export const DirectSignGasInfo = ({
  supportDirectSign,
  loading,
  openShowMore,
  noQuote,
  type = 'bridge',
  chainServeId,
  signatureInstance,
}: {
  supportDirectSign: boolean;
  loading: boolean;
  openShowMore: (v: boolean) => void;
  noQuote?: boolean;
  type?: 'send' | 'swap' | 'bridge';
  chainServeId: string;
  signatureInstance: SignatureManager;
}) => {
  const wallet = useWallet();
  const { cachedTokenList } = useRabbySelector((s) => ({
    cachedTokenList: s.account.tokens.list,
  }));
  const cachedTokenItems = useMemo(
    () => (cachedTokenList || []).map(abstractTokenToTokenItem),
    [cachedTokenList]
  );
  const [gasAccountDepositVisible, setGasAccountDepositVisible] = useState(
    false
  );
  const depositFlowActive = useGasAccountDepositFlowActive();

  const chain = useMemo(() => findChainByServerID(chainServeId), [
    chainServeId,
  ]);
  const chainId = chain?.id || 0;
  const chainEnum = chain?.enum;

  const { sig, accountId } = useGasAccountSign();

  const isGasAccountLogin = !!sig && !!accountId;

  const {
    currentAccount,
    gaConfig,
    onRedirectToDeposit,
    txs,
    txsResult,
    gasList,
    selectedGas,
    gasless,
    gasAccount,
    gasMethod,
    noCustomRPC,
    support1559,
    nativeTokenBalance,
    gasToken: ctxGasToken,
    gasPriceMedian,
    checkErrors,
    useGaslessEnabled,
    isGasNotEnough,
    nativeTokenPrice,
  } = useSignatureStoreOf(
    signatureInstance,
    (state) => ({
      currentAccount: state.config?.account,
      gaConfig: state.config?.ga,
      onRedirectToDeposit: state.config?.onRedirectToDeposit,
      txs: state.ctx?.txs || [],
      txsResult: state.ctx?.txsCalc || [],
      gasList: state.ctx?.gasList || [],
      selectedGas: state.ctx?.selectedGas,
      gasless: state.ctx?.gasless,
      gasAccount: state.ctx?.gasAccount,
      gasMethod: state.ctx?.gasMethod,
      noCustomRPC: !!state.ctx?.noCustomRPC,
      support1559: !!state.ctx?.is1559,
      nativeTokenBalance: state.ctx?.nativeTokenBalance || '0',
      gasToken: state.ctx?.gasToken,
      gasPriceMedian: state.ctx?.gasPriceMedian || null,
      checkErrors: state.ctx?.checkErrors || [],
      useGaslessEnabled: !!state.ctx?.useGasless,
      isGasNotEnough: !!state.ctx?.isGasNotEnough,
      nativeTokenPrice: state.ctx?.nativeTokenPrice || 0,
    }),
    shallowEqual
  );
  const currentTx = txs[0];
  const isGasAccountTopUpFlow =
    gaConfig?.category === 'GasAccount' && gaConfig?.action === 'deposit';
  const { isSpeedUp, isCancel } = currentTx
    ? normalizeTxParams(currentTx)
    : { isSpeedUp: false, isCancel: false };
  const showGasContent =
    !!txsResult.length &&
    !!gasList.length &&
    !!selectedGas &&
    !loading &&
    !noQuote &&
    !!currentTx &&
    !!currentAccount &&
    !!chainId;

  const isReady = txsResult.length > 0;
  const canUseGasLess = !!gasless?.is_gasless;
  const gasToken = ctxGasToken || {
    tokenId: chain?.nativeTokenAddress || '',
    symbol: chain?.nativeTokenSymbol || '',
    decimals: chain?.nativeTokenDecimals || 18,
    logoUrl: chain?.nativeTokenLogo || '',
  };
  const [tempoGasTokenList, setTempoGasTokenList] = useState<TokenItem[]>([]);
  const [tempoGasTokenLoading, setTempoGasTokenLoading] = useState(false);
  const [tempoPreferredFeeTokenId, setTempoPreferredFeeTokenId] = useState('');
  const showTempoGasTokenSelector =
    !!chain &&
    isTempoChain(chain.serverId) &&
    isTempoBatchSupportedAccountType(currentAccount?.type);
  const isHardware =
    currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER ||
    currentAccount?.type === KEYRING_CLASS.HARDWARE.ONEKEY;
  const totalGasCost = txsResult.reduce(
    (sum, item) => {
      sum.gasCostAmount = sum.gasCostAmount.plus(
        item.gasCost?.gasCostAmount || 0
      );
      sum.gasCostUsd = sum.gasCostUsd.plus(item.gasCost?.gasCostUsd || 0);
      return sum;
    },
    {
      gasCostUsd: new BigNumber(0),
      gasCostAmount: new BigNumber(0),
      success: true,
    }
  );

  let gasLessConfig =
    canUseGasLess && gasless?.promotion
      ? gasless?.promotion?.config
      : undefined;
  if (
    gasLessConfig &&
    gasless?.promotion?.id === '0ca5aaa5f0c9217e6f45fe1d109c24fb'
  ) {
    gasLessConfig = { ...gasLessConfig, dark_color: '', theme_color: '' };
  }

  const canGotoUseGasAccount =
    // isSupportedAddr &&
    noCustomRPC &&
    !!gasAccount?.balance_is_enough &&
    !gasAccount.chain_not_support &&
    !!gasAccount.is_gas_account;
  const payGasByGasAccount = gasMethod === 'gasAccount';

  const showGasLess = isReady && (isGasNotEnough || !!gasLessConfig);

  const showGasLessToSign = showGasLess && !payGasByGasAccount && canUseGasLess;

  // gas 提交使用 gasless
  const useGasLess =
    (isGasNotEnough || !!gasLessConfig) && !!canUseGasLess && useGaslessEnabled;

  const canDepositUseGasAccount =
    // isSupportedAddr &&
    noCustomRPC &&
    !!gasAccount &&
    !gasAccount?.balance_is_enough &&
    !gasAccount.chain_not_support;

  const gasAccountCanPay =
    gasMethod === 'gasAccount' &&
    // isSupportedAddr &&
    noCustomRPC &&
    !!gasAccount?.balance_is_enough &&
    !gasAccount.chain_not_support &&
    !!gasAccount.is_gas_account &&
    !(gasAccount as any).err_msg;

  const disabledProcess = payGasByGasAccount
    ? !gasAccountCanPay
    : useGasLess
    ? false
    : !txsResult.length || !!checkErrors.some((e) => e.level === 'forbidden');

  // Gasless 切换
  const handleToggleGasless = (value) => {
    signatureInstance.toggleGasless(value);
  };

  const handleChangeGasMethod = useCallback(
    async (method: 'native' | 'gasAccount') => {
      try {
        signatureInstance.setGasMethod(method);
      } catch (error) {
        console.error('Gas method change error:', error);
      }
    },
    [signatureInstance]
  );

  const handleGasChange = useCallback(
    async (gas) => {
      try {
        await signatureInstance.updateGasLevel(gas, wallet);
      } catch (error) {
        console.error('Gas change error:', error);
      }
    },
    [signatureInstance, wallet]
  );
  const handleSelectTempoGasToken = useMemoizedFn(
    async (
      token: TokenItem,
      options?: Parameters<typeof signatureInstance.setTempoFeeToken>[1]
    ) => {
      signatureInstance.setTempoFeeToken(token, options);
      if (selectedGas) {
        await handleGasChange(selectedGas as any);
      }
    }
  );

  const handleChangeGasAccount = useMemoizedFn(async () => {
    await handleChangeGasMethod('gasAccount');
    if (selectedGas) {
      await handleGasChange(selectedGas as any);
    }
  });
  const handleOpenGasAccountDeposit = useMemoizedFn(() => {
    if (
      isGasAccountTopUpFlow ||
      gasAccountDepositVisible ||
      depositFlowActive
    ) {
      return;
    }

    setGasAccountDepositVisible(true);
  });

  const handleTopUpWaitResult = useMemoizedFn(
    async (result: GasAccountTopUpResult) => {
      if (!currentAccount || !txs.length || !chain?.serverId) {
        return;
      }

      const nextTxs = await buildTopUpResumedTxs({
        txs,
        originalAccountAddress: currentAccount.address,
        originalChainServerId: chain.serverId,
        topUpResult: result,
        wallet,
      });

      signatureInstance.replaceTxs(nextTxs);
      if (selectedGas) {
        await handleGasChange(selectedGas as any);
      }
      signatureInstance.setGasMethod('gasAccount');
    }
  );

  useEffect(() => {
    if (!currentAccount?.address || !chain || !isTempoChain(chain.serverId)) {
      setTempoGasTokenList([]);
      setTempoGasTokenLoading(false);
      return;
    }

    let mounted = true;
    setTempoGasTokenLoading(true);

    const maxGasCostRawAmount = (txsResult || []).reduce(
      (sum, item) =>
        sum.plus(new BigNumber(item.gasCost.maxGasCostRawAmount || 0)),
      new BigNumber(0)
    );
    const maxGasCostRawAmountIn18 = calcTempoMaxGasCostRawAmountIn18(txs || []);
    const cachedOptions = listTempoFeeTokenOptionsFromCache({
      tokenList: cachedTokenItems,
      chainServerId: chain.serverId,
      maxGasCostRawAmount,
      maxGasCostRawAmountDecimals: gasToken.decimals || 18,
      maxGasCostRawAmountIn18,
    });
    const txFeeToken = (txs?.[0] as TxWithTempoExtras<Tx> | undefined)
      ?.feeToken as string | undefined;

    if (cachedOptions.length) {
      setTempoGasTokenList(cachedOptions);
    }

    loadTempoFeeTokenOptionsState({
      wallet,
      userAddress: currentAccount.address,
      chainServerId: chain.serverId,
      tokenList: cachedTokenItems,
      txFeeToken,
      maxGasCostRawAmount,
      maxGasCostRawAmountDecimals: gasToken.decimals || 18,
      maxGasCostRawAmountIn18,
    })
      .then(({ options, preferredTokenId, selectedOption }) => {
        if (!mounted) return;

        setTempoPreferredFeeTokenId(preferredTokenId);
        setTempoGasTokenList(options);
        if (
          selectedOption &&
          gasToken.tokenId?.toLowerCase() !== selectedOption.id.toLowerCase()
        ) {
          void handleSelectTempoGasToken(selectedOption, {
            applyFeeToken: false,
            tempoPreferredFeeTokenId: preferredTokenId,
          });
        }
      })
      .finally(() => {
        if (mounted) {
          setTempoGasTokenLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    cachedTokenItems,
    chain,
    currentAccount?.address,
    gasToken.decimals,
    gasToken.tokenId,
    handleSelectTempoGasToken,
    txs,
    txsResult,
    // wallet,
  ]);

  const gasCalcMethod = useCallback(
    async (price: number) => {
      const nativePrice = nativeTokenPrice || 0;
      const amount =
        txsResult.reduce(
          (acc, item) =>
            acc.plus(new BigNumber(item.gasUsed).times(price).div(1e18)),
          new BigNumber(0)
        ) || new BigNumber(0);

      return { gasCostUsd: amount.times(nativePrice), gasCostAmount: amount };
    },
    [nativeTokenPrice, txsResult]
  );

  const checkGasLevelIsNotEnough = useMemoizedFn(
    (
      gas: GasSelectorResponse,
      type?: 'gasAccount' | 'native'
    ): Promise<[boolean, number]> => {
      if (!isReady || !txsResult.length || !currentAccount || !chainId) {
        return Promise.resolve([true, 0]);
      }

      return Promise.all(
        txsResult.map(async (item) => {
          const tx = {
            ...item.tx,
            ...(support1559
              ? {
                  maxFeePerGas: intToHex(Math.round(gas.price || 0)),
                  maxPriorityFeePerGas:
                    gas.maxPriorityFee < 0
                      ? item.tx.maxFeePerGas
                      : intToHex(Math.round(gas.maxPriorityFee)),
                }
              : { gasPrice: intToHex(Math.round(gas.price)) }),
          };

          return {
            ...item,
            tx,
            gasCost: await explainGas({
              gasUsed: item.gasUsed,
              gasPrice: gas.price,
              chainId,
              nativeTokenPrice: item.preExecResult.native_token.price,
              wallet,
              tx,
              gasLimit: item.gasLimit,
              account: currentAccount,
              preparedL1Fee: item.L1feeCache,
            }),
          };
        })
      ).then((arr) => {
        let balance = nativeTokenBalance || '';

        if (!arr.length) {
          return [true, 0] as [boolean, number];
        }

        if (type === 'native') {
          const checkResult = arr.map((item) => {
            const result = checkGasAndNonce({
              recommendGasLimitRatio: item.recommendGasLimitRatio,
              recommendGasLimit: item.gasLimit,
              recommendNonce: item.tx.nonce,
              tx: item.tx,
              gasLimit: item.gasLimit,
              nonce: item.tx.nonce,
              isCancel,
              gasExplainResponse: item.gasCost,
              isSpeedUp,
              isGnosisAccount: false,
              nativeTokenBalance: balance,
              gasTokenDecimals: gasToken.decimals || 18,
              gasTokenId: gasToken.tokenId,
              tempoPreferredFeeTokenId:
                tempoPreferredFeeTokenId ||
                ((txs?.[0] as TxWithTempoExtras<Tx> | undefined)?.feeToken as
                  | string
                  | undefined),
              checkTxValueInBalance: !isTempoChain(chain?.serverId),
            });

            const txValueRaw = !isTempoChain(chain?.serverId)
              ? new BigNumber(item.tx.value || 0)
              : new BigNumber(0);
            balance = new BigNumber(balance)
              .minus(txValueRaw)
              .minus(new BigNumber(item.gasCost.maxGasCostAmount || 0))
              .toFixed();

            return result;
          });

          return [_.flatten(checkResult)?.some((e) => e.code === 3001), 0] as [
            boolean,
            number
          ];
        }

        return wallet.openapi
          .checkGasAccountTxs({
            sig: sig || '',
            account_id: accountId || currentAccount.address,
            tx_list: arr.map((item) => ({
              ...item.tx,
              gas: item.gasLimit,
              gasPrice: intToHex(gas.price),
            })),
          })
          .then((gasAccountRes) => [
            !gasAccountRes.balance_is_enough,
            (gasAccountRes.gas_account_cost.estimate_tx_cost || 0) +
              (gasAccountRes.gas_account_cost?.gas_cost || 0),
          ]);
      });
    }
  );

  useEffect(() => {
    if (
      shouldAutoSwitchToGasAccountFromGasless({
        showGasLess,
        isGasNotEnough,
        canUseGasLess,
        canGotoUseGasAccount: !!canGotoUseGasAccount,
      }) &&
      !payGasByGasAccount
    ) {
      void handleChangeGasAccount();
    }
  }, [
    canGotoUseGasAccount,
    canUseGasLess,
    handleChangeGasAccount,
    isGasNotEnough,
    payGasByGasAccount,
    showGasLess,
  ]);

  useEffect(() => {
    if (loading || noQuote) {
      return;
    }
    const showGasLevelPopup = !!showGasContent && !!disabledProcess;
    const gasTooHigh =
      !!showGasContent &&
      totalGasCost.gasCostUsd.gt(chainEnum === CHAINS_ENUM.ETH ? 10 : 1);
    if (showGasLevelPopup || gasTooHigh) {
      openShowMore(true);
    } else {
      openShowMore(false);
    }
  }, [
    chainEnum,
    disabledProcess,
    isReady,
    openShowMore,
    showGasContent,
    totalGasCost.gasCostUsd,
    loading,
    noQuote,
  ]);

  if (!supportDirectSign) {
    return null;
  }
  const gasTipsComponent = () => (
    <GasTipsWrapper>
      {showGasLessToSign ? (
        <GasLessActivityToSign
          directSubmit
          gasLessEnable={useGasLess}
          handleFreeGas={() => {
            handleToggleGasless?.(true);
          }}
          gasLessConfig={gasLessConfig}
        />
      ) : null}

      {shouldShowGasLessNotEnough({
        showGasLess,
        isGasNotEnough,
        payGasByGasAccount,
        canUseGasLess,
      }) ? (
        <GasLessNotEnough
          directSubmit
          nativeTokenInsufficient={isGasNotEnough}
          canGotoUseGasAccount={canGotoUseGasAccount}
          onChangeGasAccount={handleChangeGasAccount}
          canDepositUseGasAccount={canDepositUseGasAccount}
          onOpenGasAccountDeposit={handleOpenGasAccountDeposit}
          disableGasAccountDeposit={
            isGasAccountTopUpFlow ||
            gasAccountDepositVisible ||
            depositFlowActive
          }
          onRedirectToDeposit={onRedirectToDeposit}
          preserveApprovalContext
        />
      ) : null}

      {payGasByGasAccount && !gasAccountCanPay ? (
        <GasAccountTips
          directSubmit
          gasAccountCost={gasAccount as any}
          gasAccountAddress={accountId || currentAccount?.address || ''}
          isWalletConnect={false}
          noCustomRPC={noCustomRPC}
          nativeTokenInsufficient={isGasNotEnough}
          onChangeGasAccount={handleChangeGasAccount}
          onOpenGasAccountDeposit={handleOpenGasAccountDeposit}
          disableGasAccountDeposit={
            isGasAccountTopUpFlow ||
            gasAccountDepositVisible ||
            depositFlowActive
          }
          onRedirectToDeposit={onRedirectToDeposit}
          preserveApprovalContext
        />
      ) : null}
    </GasTipsWrapper>
  );

  return (
    <>
      {showGasContent ? (
        <div className={clsx(type !== 'send' && 'mt-12')}>
          <SignMainnetGasSelectorHeader
            tx={currentTx!}
            gasAccountCost={gasAccount as any}
            gasMethod={gasMethod}
            onChangeGasMethod={handleChangeGasMethod}
            disabled={false}
            isReady={isReady}
            gasLimit={String(txsResult?.[0]?.gasLimit || currentTx?.gas || 0)}
            noUpdate={false}
            gasList={gasList || []}
            selectedGas={selectedGas}
            version={txsResult?.[0]?.preExecResult?.pre_exec_version || 'v0'}
            recommendGasLimit={txsResult?.[0]?.gasLimit || currentTx?.gas || 0}
            recommendNonce={currentTx?.nonce || '0'}
            chainId={chainId}
            onChange={handleGasChange}
            nonce={String(currentTx?.nonce || '0')}
            disableNonce={true}
            isSpeedUp={!!isSpeedUp}
            isCancel={!!isCancel}
            is1559={support1559}
            isHardware={isHardware}
            manuallyChangeGasLimit={false}
            errors={checkErrors}
            nativeTokenBalance={nativeTokenBalance}
            gasToken={gasToken}
            gasPriceMedian={gasPriceMedian}
            gas={totalGasCost}
            gasCalcMethod={gasCalcMethod}
            directSubmit
            checkGasLevelIsNotEnough={checkGasLevelIsNotEnough}
            nativeTokenInsufficient={isGasNotEnough}
            freeGasAvailable={canUseGasLess}
            noCustomRPC={noCustomRPC}
            showTempoGasTokenSelector={showTempoGasTokenSelector}
            tempoGasTokenList={tempoGasTokenList}
            onSelectTempoGasToken={handleSelectTempoGasToken}
            tempoGasTokenLoading={tempoGasTokenLoading}
          />
        </div>
      ) : !loading && noQuote ? (
        <ListItem
          name={<>{'Gas fee'}</>}
          className={clsx(type !== 'send' && 'mt-12')}
        >
          <div>-</div>
        </ListItem>
      ) : (
        <ListItem
          name={<>{'Gas fee'}</>}
          className={clsx(type !== 'send' && 'mt-12')}
        >
          <Skeleton.Input
            active
            className="rounded"
            style={{
              width: 52,
              height: 12,
            }}
          />
        </ListItem>
      )}
      {showGasContent && <>{gasTipsComponent()}</>}
      <GasAccountDepositPopup
        visible={gasAccountDepositVisible}
        onCancel={() => setGasAccountDepositVisible(false)}
        onWaitDepositResult={handleTopUpWaitResult}
        minDepositPrice={
          gasAccount?.gas_account_cost?.total_cost != null
            ? Number(gasAccount.gas_account_cost.total_cost)
            : undefined
        }
        disableDirectDeposit
      />
    </>
  );
};

function ListItem({
  name,
  className,
  children,
}: PropsWithChildren<{ name: React.ReactNode; className?: string }>) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between',
        'text-12 text-r-neutral-foot',
        className
      )}
    >
      <span>{name}</span>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

export const RecommendFromToken = ({
  token,
  className,
  onOk,
}: {
  token: TokenItem;
  className?: string;
  onOk: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={clsx(
        'flex items-center',
        'h-[44px] pl-12 pr-10 rounded-[8px]',
        'bg-r-neutral-card-1',
        className
      )}
    >
      <div
        className={clsx(
          'flex-1 flex items-center',
          'text-12 text-rabby-neutral-title-1'
        )}
      >
        <Trans t={t} i18nKey={'page.bridge.recommendFromToken'}>
          Bridge from
          <div
            className={clsx(
              'flex items-center gap-6',
              'px-8 py-6 mx-6',
              'text-r-blue-default',
              'bg-rabby-blue-light1 rounded-[6px]'
            )}
          >
            <TokenWithChain
              token={token}
              width="16px"
              height="16px"
              chainSize={'10px'}
            />
            <span>{getTokenSymbol(token)}</span>
          </div>
          for an available quote
        </Trans>
      </div>
      <Button
        type="primary"
        className="h-24 text-13 font-medium px-10 py-0"
        onClick={onOk}
      >
        {t('global.ok')}
      </Button>
    </div>
  );
};
