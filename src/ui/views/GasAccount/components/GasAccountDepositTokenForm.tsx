import { Popup, TokenWithChain } from '@/ui/component';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { formatUsdValue } from '@/ui/utils/number';
import { getTokenSymbol, tokenAmountBn } from '@/ui/utils/token';
import { useWallet, isSameAddress } from '@/ui/utils';
import BigNumber from 'bignumber.js';
import { Button, Skeleton, Tooltip, message } from 'antd';
import clsx from 'clsx';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useAsync, useDebounce } from 'react-use';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import {
  GasAccountAvailableToken,
  getTokenUsdValue,
  invalidateGasAccountDepositTokensCache,
  useGasAccountDepositAvailableTokens,
} from '../hooks/useDepositTokenAvailability';
import {
  useGasAccountHistoryRefresh,
  useGasAccountInfoV2,
  useGasAccountMethods,
  useGasAccountRefresh,
  useGasAccountSign,
} from '../hooks';
import { Account } from '@/background/service/preference';
import { supportedDirectSign } from '@/ui/hooks/useMiniApprovalDirectSign';
import { GasAccountDepositTokenPicker } from './GasAccountDepositTokenPicker';
import {
  buildOwnerAccountMap,
  getBridgeFromTokenAmount,
  getDepositAmountValidation,
  getDepositBalanceCopy,
  getDefaultDepositUsdValue,
  getDepositMaxUsdValue,
  getMinDepositUsdValue,
} from './GasAccountDepositTokenForm.utils';
import {
  buildGasAccountBridgeTxs,
  buildTopUpGasAccount,
  fetchGasAccountBridgeQuote,
  getGasAccountDirectDepositAddress,
  pollDepositStatus,
} from './depositUtils';
import { GasAccountBridgeQuote, Tx } from '@rabby-wallet/rabby-api/dist/types';
import { GasAccountTopUpWaitCallback } from './topUpContinuation';
import { RcIconArrowDownCC } from '@/ui/assets/desktop/common';
import { ReactComponent as RcIconCloseCC } from 'ui/assets/component/close-cc.svg';
import { ReactComponent as RcIconInfo } from 'ui/assets/info-cc.svg';
import { findChainByServerID } from '@/utils/chain';
import { CHAINS_ENUM } from '@/types/chain';

interface GasAccountDepositTokenFormProps {
  visible?: boolean;
  onClose?(): void;
  onDeposit?(): Promise<void> | void;
  onWaitDepositResult?: GasAccountTopUpWaitCallback;
  minDepositPrice?: number;
  disableDirectDeposit?: boolean;
  maxAccountCount?: number;
}

const PENDING_STATUS_MAX_ATTEMPTS = 100;
const GAS_ACCOUNT_DEPOSIT_POPUP_HEIGHT = 360;
const QUICK_DEPOSIT_PERCENT_PRESETS = [25, 50, 75];

type SubmittedDepositTxInfo = {
  trackingTxHash: string;
  nonceSourceTxHash: string;
  consumedNonceCount: number;
};

const buildSubmittedDepositTxInfo = (
  txHashes: Array<string | undefined | null>
): SubmittedDepositTxInfo | null => {
  const normalizedTxHashes = txHashes.filter((hash): hash is string => !!hash);

  if (!normalizedTxHashes.length) {
    return null;
  }

  return {
    trackingTxHash: normalizedTxHashes[normalizedTxHashes.length - 1],
    nonceSourceTxHash: normalizedTxHashes[0],
    consumedNonceCount: normalizedTxHashes.length,
  };
};

const formatQuickDepositUsdValue = (amount: BigNumber.Value) =>
  new BigNumber(amount)
    .decimalPlaces(4, BigNumber.ROUND_DOWN)
    .toFixed()
    .replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');

export const GasAccountDepositTokenForm: React.FC<GasAccountDepositTokenFormProps> = ({
  visible,
  onClose,
  onDeposit,
  onWaitDepositResult,
  minDepositPrice,
  disableDirectDeposit,
  maxAccountCount,
}) => {
  const { t } = useTranslation();
  const { allSortedAccountList, fetchAllAccounts } = useAccounts();

  useEffect(() => {
    if (!visible || allSortedAccountList.length) {
      return;
    }

    fetchAllAccounts();
  }, [allSortedAccountList.length, fetchAllAccounts, visible]);

  if (!allSortedAccountList.length) {
    return (
      <Popup
        visible={visible}
        onCancel={onClose}
        height={GAS_ACCOUNT_DEPOSIT_POPUP_HEIGHT}
        isSupportDarkMode
        bodyStyle={{ padding: 0, height: '100%' }}
        destroyOnClose
        closable={false}
        push={false}
      >
        <PopupContainer className="h-full">
          <div className="bg-r-neutral-bg2 h-full flex flex-col relative overflow-hidden rounded-t-[16px]">
            <div className="relative flex items-center justify-center h-[52px] shrink-0">
              <div className="text-[20px] font-medium text-r-neutral-title-1 text-center">
                {t('page.gasAccount.depositPopup.gasDepositTitle')}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="absolute right-20 top-1/2 -translate-y-1/2 flex items-center justify-center w-[20px] h-[20px]"
              >
                <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot" />
              </button>
            </div>
            <div className="px-20 pb-8 flex-1 overflow-y-auto">
              <div className="bg-r-neutral-card1 rounded-[8px] px-20 py-20">
                <Skeleton active paragraph={{ rows: 4 }} title={false} />
              </div>
            </div>
          </div>
        </PopupContainer>
      </Popup>
    );
  }

  return (
    <GasAccountDepositTokenFormInner
      visible={visible}
      onClose={onClose}
      onDeposit={onDeposit}
      onWaitDepositResult={onWaitDepositResult}
      minDepositPrice={minDepositPrice}
      disableDirectDeposit={disableDirectDeposit}
      maxAccountCount={maxAccountCount}
      allSortedAccountList={allSortedAccountList as Account[]}
    />
  );
};

const GasAccountDepositTokenFormInner: React.FC<
  GasAccountDepositTokenFormProps & {
    allSortedAccountList: Account[];
  }
> = ({
  visible,
  onClose,
  onDeposit,
  onWaitDepositResult,
  minDepositPrice,
  disableDirectDeposit,
  maxAccountCount,
  allSortedAccountList,
}) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const { sig, accountId } = useGasAccountSign();
  const { login } = useGasAccountMethods();
  const { refresh: refreshGasAccount } = useGasAccountRefresh();
  const { refreshHistory } = useGasAccountHistoryRefresh();
  const isInTxFlow = !!onWaitDepositResult;
  const {
    availableTokens: rawAvailableTokens,
    isCheckingAvailability,
    refreshAvailableTokens,
  } = useGasAccountDepositAvailableTokens({
    minDepositPrice,
    disableDirectDeposit,
    maxAccountCount,
  });

  const ownerAccountMap = useMemo(
    () =>
      buildOwnerAccountMap(
        rawAvailableTokens,
        allSortedAccountList as Account[],
        isInTxFlow ? (account) => supportedDirectSign(account.type) : undefined
      ),
    [allSortedAccountList, isInTxFlow, rawAvailableTokens]
  );

  const availableTokens = useMemo(
    () =>
      rawAvailableTokens.filter((token) => {
        const ownerAccount = ownerAccountMap.get(
          token.owner_addr.toLowerCase()
        );
        return (
          !!ownerAccount &&
          (!isInTxFlow || supportedDirectSign(ownerAccount.type))
        );
      }),
    [isInTxFlow, ownerAccountMap, rawAvailableTokens]
  );

  const eligibleAccountAddressSet = useMemo(
    () =>
      new Set(availableTokens.map((token) => token.owner_addr.toLowerCase())),
    [availableTokens]
  );
  const eligibleAccounts = useMemo(
    () =>
      allSortedAccountList.filter((account) =>
        eligibleAccountAddressSet.has(account.address.toLowerCase())
      ) as Account[],
    [allSortedAccountList, eligibleAccountAddressSet]
  );

  const [usdValue, setUsdValue] = useState(() =>
    getDefaultDepositUsdValue(minDepositPrice)
  );
  const [selectedTokenSnapshot, setSelectedToken] = useState<
    GasAccountAvailableToken | undefined
  >();
  const [tokenPickerVisible, setTokenPickerVisible] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [bridgeQuote, setBridgeQuote] = useState<GasAccountBridgeQuote | null>(
    null
  );
  const [quoteAmountValue, setQuoteAmountValue] = useState<number | null>(null);
  const [bridgeQuoteError, setBridgeQuoteError] = useState('');
  const [loading, setLoading] = useState(false);
  const quoteReqIdRef = useRef(0);
  const didInitSelectedTokenRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const pollCancelRef = useRef<(() => void) | null>(null);
  const resetBridgeQuoteState = useCallback(() => {
    setBridgeQuote(null);
    setQuoteAmountValue(null);
    setBridgeQuoteError('');
    setQuoteLoading(false);
  }, []);

  const { value: selectedTokenInfo } = useAsync(async () => {
    const ownerAddr = selectedTokenSnapshot?.owner_addr;
    const chain = selectedTokenSnapshot?.chain;
    const tokenId = selectedTokenSnapshot?.id;

    if (!ownerAddr || !chain || !tokenId) {
      return null;
    }

    const token = await wallet.openapi.getToken(ownerAddr, chain, tokenId);

    return {
      ...token,
      owner_addr: ownerAddr,
    };
  }, [
    selectedTokenSnapshot?.owner_addr,
    selectedTokenSnapshot?.chain,
    selectedTokenSnapshot?.id,
    wallet,
  ]);

  const selectedToken = useMemo<GasAccountAvailableToken | undefined>(() => {
    const snapshot = selectedTokenSnapshot;

    if (!snapshot || !selectedTokenInfo) {
      return snapshot;
    }

    const isSameSelectedToken =
      isSameAddress(snapshot.owner_addr, selectedTokenInfo.owner_addr) &&
      snapshot.chain === selectedTokenInfo.chain &&
      isSameAddress(snapshot.id, selectedTokenInfo.id);

    if (!isSameSelectedToken) {
      return snapshot;
    }

    return {
      ...snapshot,
      ...selectedTokenInfo,
      owner_addr: snapshot.owner_addr,
      gasAccountDepositType: snapshot.gasAccountDepositType,
    };
  }, [selectedTokenInfo, selectedTokenSnapshot]);

  useEffect(() => {
    return () => {
      pollCancelRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      refreshAvailableTokens();
    }
  }, [refreshAvailableTokens, visible]);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setUsdValue(getDefaultDepositUsdValue(minDepositPrice));
    }

    wasVisibleRef.current = !!visible;

    if (!visible) {
      setTokenPickerVisible(false);
      resetBridgeQuoteState();
      setLoading(false);
    }
  }, [minDepositPrice, resetBridgeQuoteState, visible]);

  useEffect(() => {
    if (!availableTokens.length) {
      setSelectedToken(undefined);
      return;
    }

    if (!didInitSelectedTokenRef.current) {
      didInitSelectedTokenRef.current = true;
      setSelectedToken((current) => {
        if (current) {
          return current;
        }

        return (
          availableTokens.find((item) => item.chain !== 'eth') ||
          availableTokens[0]
        );
      });
      return;
    }
  }, [availableTokens]);

  const selectedOwnerAccount = useMemo(
    () =>
      selectedToken
        ? ownerAccountMap.get(selectedToken.owner_addr.toLowerCase())
        : undefined,
    [ownerAccountMap, selectedToken]
  );
  const selectedOwnerAddress = selectedOwnerAccount?.address;
  const selectedBridgeQuoteTokenKey = selectedToken
    ? [
        selectedToken.owner_addr.toLowerCase(),
        selectedToken.chain,
        selectedToken.id.toLowerCase(),
        selectedToken.decimals,
        selectedToken.price,
      ].join(':')
    : '';
  const realGasAccountAddress = accountId || selectedOwnerAccount?.address;
  const { value: currentGasAccountInfo } = useGasAccountInfoV2({
    address: minDepositPrice ? realGasAccountAddress : undefined,
  });

  const signerAccount = (selectedOwnerAccount ||
    eligibleAccounts[0] ||
    allSortedAccountList[0]) as Account | undefined;
  const { openUI, resetGasStore, close: closeSign } = useMiniSigner({
    account: signerAccount as Account,
  });
  const { value: gasMarketResult } = useAsync(async () => {
    if (!selectedToken?.chain) {
      return null;
    }

    return {
      chainId: selectedToken.chain,
      gasList: await wallet.gasMarketV2({
        chainId: selectedToken.chain,
      }),
    };
  }, [selectedToken?.chain, wallet]);

  const amountValue = Number(usdValue || 0);
  const canUseMiniSign = selectedOwnerAccount?.type
    ? supportedDirectSign(selectedOwnerAccount.type)
    : false;
  const minDepositUsd = getMinDepositUsdValue(minDepositPrice);
  const chainInfo = useMemo(
    () =>
      selectedToken?.chain
        ? findChainByServerID(selectedToken.chain) || null
        : null,
    [selectedToken?.chain]
  );
  const tokenIsNativeToken = useMemo(() => {
    if (!selectedToken) {
      return false;
    }

    return isSameAddress(selectedToken.id, chainInfo?.nativeTokenAddress || '');
  }, [chainInfo?.nativeTokenAddress, selectedToken]);
  const nativeTokenDecimals = useMemo(
    () => chainInfo?.nativeTokenDecimals || 1e18,
    [chainInfo?.nativeTokenDecimals]
  );
  const maxReserveGasLimit = useMemo(
    () => (chainInfo?.enum === CHAINS_ENUM.ETH ? 1000000 : 2000000),
    [chainInfo?.enum]
  );
  const isBridgeDeposit = selectedToken?.gasAccountDepositType === 'bridge';
  const directTokenBalance = Number(selectedToken?.amount || 0);
  const tokenBalanceUsd = getTokenUsdValue(selectedToken);
  const bridgeFromTokenAmount = getBridgeFromTokenAmount({
    amountValue,
    tokenPrice: selectedToken?.price,
  });
  const depositMaxUsdValue = getDepositMaxUsdValue({
    isBridgeDeposit: !!isBridgeDeposit,
    directTokenBalance,
    tokenBalanceUsd,
  });
  const quickDepositBaseUsdValue = depositMaxUsdValue;
  const maxQuickDepositValue = useMemo(() => {
    if (!selectedToken) {
      return '';
    }

    const fallbackValue = formatQuickDepositUsdValue(quickDepositBaseUsdValue);

    if (!tokenIsNativeToken) {
      return fallbackValue;
    }

    if (
      gasMarketResult?.chainId !== selectedToken.chain ||
      !gasMarketResult.gasList?.length
    ) {
      return fallbackValue;
    }

    const normalPrice =
      gasMarketResult.gasList.find((item) => item.level === 'normal')?.price ||
      0;
    if (!normalPrice) {
      return fallbackValue;
    }

    const reservedNativeTokenAmount = new BigNumber(maxReserveGasLimit)
      .times(normalPrice)
      .div(10 ** nativeTokenDecimals);
    const retainedAmount = tokenAmountBn(selectedToken).minus(
      reservedNativeTokenAmount
    );

    if (retainedAmount.lte(0)) {
      return fallbackValue;
    }

    return formatQuickDepositUsdValue(
      selectedToken.gasAccountDepositType === 'direct'
        ? retainedAmount
        : retainedAmount.times(selectedToken.price || 0)
    );
  }, [
    gasMarketResult,
    maxReserveGasLimit,
    nativeTokenDecimals,
    quickDepositBaseUsdValue,
    selectedToken,
    tokenIsNativeToken,
  ]);
  const quickDepositButtons = useMemo(() => {
    if (!selectedToken || quickDepositBaseUsdValue <= 0) {
      return [];
    }

    return [
      ...QUICK_DEPOSIT_PERCENT_PRESETS.map((pct) => ({
        key: `${pct}`,
        label: `${pct}%`,
        value: formatQuickDepositUsdValue(
          new BigNumber(quickDepositBaseUsdValue).times(pct).div(100)
        ),
      })),
      {
        key: 'max',
        label: 'Max',
        value: maxQuickDepositValue,
      },
    ];
  }, [maxQuickDepositValue, quickDepositBaseUsdValue, selectedToken]);
  const balanceText = formatUsdValue(depositMaxUsdValue);
  const balanceDisplayText = formatUsdValue(tokenBalanceUsd);
  const validationMessages = {
    unavailablePaymentWallet: t(
      'page.gasAccount.depositPopup.unavailablePaymentWallet',
      {
        defaultValue: 'Selected payment wallet is unavailable',
      }
    ),
    invalidAmount: t('page.gasAccount.depositPopup.invalidAmount'),
    zeroInvalidAmount: t('page.gasAccount.depositPopup.zeroInvalidAmount', {
      defaultValue: 'The amount cannot be zero',
    }),
    minAmountRequired: t('page.gasAccount.depositPopup.minAmountRequired', {
      value: minDepositUsd,
      defaultValue: 'Minimum deposit amount is ${{value}}',
    }),
    insufficientTokenBalance: t('page.gasTopUp.InsufficientBalanceTips'),
    fetchQuoteFailed: t('page.perps.depositAmountPopup.fetchQuoteFailed'),
    insufficientBalanceLabel: t(
      'page.gasAccount.depositPopup.insufficientBalanceLabel',
      {
        defaultValue: 'Insufficient Balance',
      }
    ),
  };

  const amountValidation = getDepositAmountValidation({
    hasSelectedToken: !!selectedToken,
    hasSelectedOwnerAccount: !!selectedOwnerAccount,
    usdValue,
    amountValue,
    isBridgeDeposit: !!isBridgeDeposit,
    directTokenBalance,
    tokenBalanceUsd,
    hasTokenPrice: !!selectedToken?.price,
    minDepositUsd,
    messages: validationMessages,
  });

  const shouldResetBridgeQuote =
    !visible ||
    !isBridgeDeposit ||
    !selectedToken ||
    !selectedOwnerAccount ||
    !amountValidation.isValid;
  const canFetchBridgeQuote = !loading && !shouldResetBridgeQuote;

  useEffect(() => {
    if (shouldResetBridgeQuote) {
      quoteReqIdRef.current += 1;
      resetBridgeQuoteState();
    }
  }, [resetBridgeQuoteState, shouldResetBridgeQuote]);

  useDebounce(
    () => {
      if (!canFetchBridgeQuote) {
        return;
      }

      const requestId = ++quoteReqIdRef.current;
      setQuoteLoading(true);
      setBridgeQuote(null);
      setQuoteAmountValue(null);
      setBridgeQuoteError('');

      fetchGasAccountBridgeQuote({
        wallet,
        token: selectedToken,
        account: selectedOwnerAccount,
        usdValue: amountValue,
      })
        .then((quote) => {
          if (quoteReqIdRef.current !== requestId) {
            return;
          }

          setBridgeQuote(quote);
          setQuoteAmountValue(amountValue);
        })
        .catch((error) => {
          if (quoteReqIdRef.current !== requestId) {
            return;
          }
          console.error('fetchGasAccountBridgeQuote error', error);
          setBridgeQuote(null);
          setQuoteAmountValue(null);
          setBridgeQuoteError(validationMessages.fetchQuoteFailed);
        })
        .finally(() => {
          if (quoteReqIdRef.current === requestId) {
            setQuoteLoading(false);
          }
        });
    },
    300,
    [
      amountValue,
      canFetchBridgeQuote,
      selectedBridgeQuoteTokenKey,
      selectedOwnerAddress,
      validationMessages.fetchQuoteFailed,
      wallet,
    ]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let nextValue = event.target.value;
      if (nextValue.startsWith('$')) {
        nextValue = nextValue.slice(1);
      }
      nextValue = nextValue.replace(/[^\d.]/g, '');
      if (nextValue.startsWith('.')) {
        nextValue = `0${nextValue}`;
      }

      const [integer, ...rest] = nextValue.split('.');
      const normalizedInteger = integer.replace(/^0+(?=\d)/, '');
      const normalizedDecimal = rest.join('').slice(0, 4);
      const normalizedValue = rest.length
        ? `${normalizedInteger || '0'}.${normalizedDecimal}`
        : normalizedInteger;

      setUsdValue(normalizedValue);
    },
    []
  );
  const handleQuickAmountClick = useCallback((value: string) => {
    setUsdValue(value);
  }, []);

  const quoteError = useMemo(() => {
    if (shouldResetBridgeQuote || quoteLoading) {
      return '';
    }
    return bridgeQuoteError;
  }, [bridgeQuoteError, quoteLoading, shouldResetBridgeQuote]);

  const estReceiveUsdValue = useMemo(() => {
    if (!selectedToken) {
      return 0;
    }

    return selectedToken.gasAccountDepositType === 'direct'
      ? amountValue
      : Number(bridgeQuote?.to_token_amount || 0);
  }, [amountValue, bridgeQuote?.to_token_amount, selectedToken]);

  const estReceiveLabel = t('page.gasAccount.depositPopup.estReceiveLabel', {
    usd: formatUsdValue(estReceiveUsdValue),
    defaultValue: 'Est.Receive: {{usd}}',
  });
  const displayedEstReceiveLabel = useMemo(() => {
    if (!minDepositPrice) {
      return estReceiveLabel;
    }

    const estRemainingBalance = new BigNumber(estReceiveUsdValue)
      .plus(currentGasAccountInfo?.account?.balance || 0)
      .minus(minDepositPrice);

    return t('page.gasAccount.depositPayPopup.topUpPayTips', {
      topUpUsd: formatUsdValue(minDepositPrice),
      balance: formatUsdValue(
        estRemainingBalance.lt(0) ? 0 : estRemainingBalance.toFixed()
      ),
      defaultValue:
        'Gas required: {{topUpUsd}}, Gas remaining est: {{balance}}',
    });
  }, [
    currentGasAccountInfo?.account?.balance,
    estReceiveLabel,
    estReceiveUsdValue,
    minDepositPrice,
    t,
  ]);
  const estReceiveTip = t('page.gasAccount.depositPopup.estReceiveTip', {
    name: bridgeQuote?.bridge_id,
    defaultValue: 'Service processed via {{name}}, may have slippage',
  });

  const canSubmit = useMemo(() => {
    if (
      !selectedToken ||
      !selectedOwnerAccount ||
      !amountValidation.isValid ||
      loading
    ) {
      return false;
    }

    if (selectedToken.gasAccountDepositType !== 'bridge') {
      return true;
    }

    return (
      !quoteLoading &&
      quoteAmountValue === amountValue &&
      !!bridgeQuote?.tx &&
      !quoteError
    );
  }, [
    amountValidation.isValid,
    amountValue,
    bridgeQuote?.tx,
    loading,
    quoteAmountValue,
    quoteError,
    quoteLoading,
    selectedOwnerAccount,
    selectedToken,
  ]);

  const balanceCopy = getDepositBalanceCopy({
    hasSelectedToken: !!selectedToken,
    tokenBalanceUsd,
    amountValue,
    formattedBalance: selectedToken ? balanceDisplayText : balanceText,
    balanceLabel: t('page.gasAccount.depositPopup.balanceLabel'),
    insufficientBalanceLabel: t('page.gasAccount.depositPopup.balanceLabel'),
  });

  const ensureGasAccountLogin = useCallback(
    async (account: Account) => {
      if (!sig || !accountId) {
        const loginResult = await login(account);
        if (!loginResult) {
          return null;
        }
      }

      const nextSession = await wallet.getGasAccountSig();
      if (!nextSession?.sig || !nextSession?.accountId) {
        throw new Error('GasAccount login failed');
      }
      return nextSession;
    },
    [accountId, login, sig, wallet]
  );

  const getRequiredGasAccountSession = useCallback(async (): Promise<{
    sig: string;
    accountId: string;
  }> => {
    const gasAccountSession = await wallet.getGasAccountSig();
    if (!gasAccountSession?.sig || !gasAccountSession?.accountId) {
      throw new Error('GasAccount login failed');
    }

    return {
      sig: gasAccountSession.sig,
      accountId: gasAccountSession.accountId,
    };
  }, [wallet]);

  const schedulePostDepositStateRefresh = useCallback(() => {
    const runRefresh = () => {
      refreshGasAccount();
      refreshHistory();
    };

    runRefresh();
  }, [refreshGasAccount, refreshHistory]);

  const afterTopUpGasAccount = useCallback(
    async ({
      chainServerId,
      amount,
      tx,
      account,
    }: {
      chainServerId: string;
      amount: number;
      tx?: string;
      account: Account;
    }) => {
      if (!tx) {
        throw new Error('GasAccount top up tx failed');
      }

      const usedNonce =
        (await wallet.getNonceByChain(
          account.address,
          findChainByServerID(chainServerId)!.id
        )) || 0;

      if (!usedNonce) {
        throw new Error('GasAccount top up nonce missing');
      }

      const gasAccountSession = await getRequiredGasAccountSession();

      await wallet.openapi.rechargeGasAccount({
        sig: gasAccountSession.sig,
        account_id: gasAccountSession.accountId,
        tx_id: tx,
        chain_id: chainServerId,
        amount,
        user_addr: account.address,
        nonce: usedNonce - 1,
      });
    },
    [getRequiredGasAccountSession, wallet]
  );

  const openMiniSignDeposit = useCallback(
    async (txs: Tx[]) => {
      resetGasStore();
      closeSign();
      return openUI({
        txs,
        ga: {
          category: 'GasAccount',
          action: 'deposit',
        },
        checkGasFeeTooHigh: true,
        autoUseGasFree: true,
      });
    },
    [closeSign, openUI, resetGasStore]
  );

  const afterBridgeTopUpGasAccount = useCallback(
    async ({
      chainServerId,
      tokenId,
      tokenAmount,
      usdValue,
      txId,
      account,
      scene,
    }: {
      chainServerId: string;
      tokenId: string;
      tokenAmount: number;
      usdValue: number;
      txId: string;
      account: Account;
      scene: 'in_tx_flow' | 'recharge';
    }) => {
      const gasAccountSession = await getRequiredGasAccountSession();

      await wallet.openapi.createGasAccountBridgeRecharge({
        sig: gasAccountSession.sig,
        gas_account_id: gasAccountSession.accountId,
        user_addr: account.address,
        from_chain_id: chainServerId,
        from_token_id: tokenId,
        from_token_amount: tokenAmount,
        from_usd_value: usdValue,
        tx_id: txId,
        scene,
      });
    },
    [getRequiredGasAccountSession, wallet]
  );

  const finishDepositSuccess = useCallback(
    async (accountAddress: string) => {
      invalidateGasAccountDepositTokensCache(accountAddress);
      schedulePostDepositStateRefresh();
      if (onDeposit) {
        await onDeposit();
      } else {
        message.success(t('page.gasAccount.depositPopup.depositSuccess'));
      }
      onClose?.();
    },
    [onClose, onDeposit, schedulePostDepositStateRefresh, t]
  );

  const submitDirectDeposit = useCallback(
    async ({
      token,
      account,
      usdValue,
    }: {
      token: GasAccountAvailableToken;
      account: Account;
      usdValue: number;
    }) => {
      const depositAddress = getGasAccountDirectDepositAddress(token.chain);
      if (!depositAddress) {
        throw new Error('Gas account deposit address missing');
      }

      const params = {
        to: depositAddress,
        chainServerId: token.chain,
        tokenId: token.id,
        amount: usdValue,
        rawAmount: new BigNumber(usdValue)
          .times(10 ** token.decimals)
          .decimalPlaces(0, BigNumber.ROUND_DOWN)
          .toFixed(),
        account,
      };

      if (!canUseMiniSign) {
        const tx = await buildTopUpGasAccount(params);
        const txHashes = await wallet.submitGasAccountDepositTxs({
          account,
          txs: [tx],
          amount: usdValue,
          chainServerId: token.chain,
          depositType: 'direct',
        });
        return buildSubmittedDepositTxInfo(txHashes);
      }

      const tx = await buildTopUpGasAccount(params);
      const txHash = (await openMiniSignDeposit([tx]))?.[0];
      if (!txHash) {
        return null;
      }

      await afterTopUpGasAccount({
        ...params,
        tx: txHash,
      });

      return buildSubmittedDepositTxInfo([txHash]);
    },
    [afterTopUpGasAccount, canUseMiniSign, openMiniSignDeposit, wallet]
  );

  const submitBridgeDeposit = useCallback(
    async ({
      token,
      account,
      quote,
      usdValue,
      tokenAmount,
    }: {
      token: GasAccountAvailableToken;
      account: Account;
      quote: GasAccountBridgeQuote;
      usdValue: number;
      tokenAmount: number;
    }) => {
      const bridgeTxs = await buildGasAccountBridgeTxs({
        wallet,
        token,
        account,
        quote,
        usdValue,
      });

      if (!canUseMiniSign) {
        const bridgeTxHashes = await wallet.submitGasAccountDepositTxs({
          account,
          txs: bridgeTxs,
          amount: usdValue,
          chainServerId: token.chain,
          depositType: 'bridge',
          tokenId: token.id,
          tokenAmount,
          scene: onWaitDepositResult ? 'in_tx_flow' : 'recharge',
        });

        return buildSubmittedDepositTxInfo(bridgeTxHashes);
      }

      const bridgeTxHashes = (await openMiniSignDeposit(bridgeTxs)) || [];
      const submittedDeposit = buildSubmittedDepositTxInfo(bridgeTxHashes);

      if (!submittedDeposit) {
        return null;
      }

      await afterBridgeTopUpGasAccount({
        chainServerId: token.chain,
        tokenId: token.id,
        tokenAmount,
        usdValue,
        txId: submittedDeposit.trackingTxHash,
        account,
        scene: onWaitDepositResult ? 'in_tx_flow' : 'recharge',
      });

      return submittedDeposit;
    },
    [
      afterBridgeTopUpGasAccount,
      canUseMiniSign,
      onWaitDepositResult,
      openMiniSignDeposit,
      wallet,
    ]
  );

  const waitForDepositResult = useCallback(
    async ({
      submittedDeposit,
      chainServerId,
      account,
    }: {
      submittedDeposit: SubmittedDepositTxInfo;
      chainServerId: string;
      account: Account;
    }) => {
      if (!onWaitDepositResult) {
        return;
      }

      const { promise: pollPromise, cancel } = pollDepositStatus({
        wallet,
        params: {
          from_chain_id: chainServerId,
          tx_id: submittedDeposit.trackingTxHash,
        },
        maxAttempts: PENDING_STATUS_MAX_ATTEMPTS,
      });
      pollCancelRef.current = cancel;
      const success = await pollPromise;
      pollCancelRef.current = null;

      if (success === 'cancel') {
        onClose?.();
        return;
      }

      if (success) {
        message.success(t('page.gasAccount.depositPopup.depositSuccess'));
        try {
          await onWaitDepositResult({
            type: 'token',
            ownerAddress: account.address,
            chainServerId,
          });

          invalidateGasAccountDepositTokensCache(account.address);
          await onDeposit?.();
        } catch (error) {
          console.error(
            'GasAccountDepositTokenForm post-deposit resume error',
            error
          );
        } finally {
          schedulePostDepositStateRefresh();
        }
        onClose?.();
        return;
      }

      message.error(
        t('page.gasAccount.depositFailed', {
          defaultValue: 'Deposit failed',
        })
      );
      schedulePostDepositStateRefresh();
      onClose?.();
    },
    [
      onClose,
      onDeposit,
      onWaitDepositResult,
      schedulePostDepositStateRefresh,
      t,
      wallet,
    ]
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedToken || !selectedOwnerAccount) {
      return;
    }

    if (!amountValidation.isValid) {
      return;
    }

    setLoading(true);
    try {
      if (
        canUseMiniSign &&
        !(await ensureGasAccountLogin(selectedOwnerAccount))
      ) {
        return;
      }
      const submittedDeposit =
        selectedToken.gasAccountDepositType === 'direct'
          ? await submitDirectDeposit({
              token: selectedToken,
              account: selectedOwnerAccount,
              usdValue: amountValue,
            })
          : bridgeQuote?.tx && quoteAmountValue === amountValue
          ? await submitBridgeDeposit({
              token: selectedToken,
              account: selectedOwnerAccount,
              quote: bridgeQuote,
              usdValue: amountValue,
              tokenAmount: bridgeFromTokenAmount,
            })
          : null;

      if (!submittedDeposit) {
        return;
      }

      if (onWaitDepositResult) {
        await waitForDepositResult({
          submittedDeposit,
          chainServerId: selectedToken.chain,
          account: selectedOwnerAccount,
        });
        return;
      }

      await finishDepositSuccess(selectedOwnerAccount.address);
    } catch (error) {
      const errorText =
        error instanceof Error
          ? error.message.toLowerCase()
          : String(error).toLowerCase();
      if (errorText.includes('cancel')) {
        return;
      }

      console.error('GasAccountDepositTokenForm handleSubmit error', error);
      message.error(
        selectedToken?.gasAccountDepositType === 'bridge'
          ? t('page.gasAccount.depositPopup.bridgeDepositFailed', {
              defaultValue: 'Bridge deposit failed, please retry',
            })
          : t('page.gasAccount.depositPopup.depositFailed', {
              defaultValue: 'Deposit failed, please retry',
            })
      );
    } finally {
      setLoading(false);
    }
  }, [
    amountValidation.isValid,
    amountValue,
    bridgeFromTokenAmount,
    bridgeQuote,
    canUseMiniSign,
    ensureGasAccountLogin,
    finishDepositSuccess,
    onWaitDepositResult,
    quoteAmountValue,
    selectedOwnerAccount,
    selectedToken,
    submitBridgeDeposit,
    submitDirectDeposit,
    t,
    waitForDepositResult,
  ]);

  const amountTokenText = selectedToken
    ? selectedToken.gasAccountDepositType === 'direct'
      ? `${usdValue || '0'} ${getTokenSymbol(selectedToken)}`
      : `${
          usdValue
            ? new BigNumber(usdValue)
                .div(selectedToken.price || 1)
                .decimalPlaces(6, BigNumber.ROUND_DOWN)
                .toFixed()
            : '0'
        } ${getTokenSymbol(selectedToken)}`
    : '$0';
  const infoText = amountValidation.errorMessage || quoteError;
  const shouldShowReceiveMetrics =
    !!selectedToken && amountValidation.isValid && !infoText;
  const hasQuickAmountOptions = !!quickDepositButtons.length;

  return (
    <Popup
      visible={visible}
      onCancel={onClose}
      height={GAS_ACCOUNT_DEPOSIT_POPUP_HEIGHT}
      isSupportDarkMode
      bodyStyle={{ padding: 0, height: '100%' }}
      destroyOnClose
      closable={false}
      push={false}
    >
      <PopupContainer className="h-full">
        <div className="bg-r-neutral-bg2 h-full flex flex-col relative overflow-hidden rounded-t-[16px]">
          <div className="relative flex items-center justify-center h-[52px] shrink-0">
            <div className="text-[20px] font-medium text-r-neutral-title-1 text-center">
              {t('page.gasAccount.depositPopup.gasDepositTitle', {
                defaultValue: 'Gas Deposit',
              })}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-20 top-1/2 -translate-y-1/2 flex items-center justify-center w-[20px] h-[20px]"
            >
              <RcIconCloseCC className="w-[20px] h-[20px] text-r-neutral-foot" />
            </button>
          </div>

          <div className="px-20 pb-8 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-10">
              <div className="text-13 leading-[16px] text-r-neutral-foot">
                {t('page.gasAccount.depositPopup.amount')}
              </div>
              <div
                className={clsx(
                  'text-13 leading-[16px]',
                  balanceCopy.isInsufficient
                    ? 'text-r-red-default'
                    : 'text-r-neutral-foot'
                )}
              >
                {balanceCopy.copy}
              </div>
            </div>

            <div className="flex items-center bg-r-neutral-card1 rounded-[8px] px-16 h-[100px]">
              <div className="flex items-center gap-8 w-full">
                <div className="flex-1 flex flex-col min-w-0">
                  <input
                    className={clsx(
                      'text-[28px] leading-[34px] font-medium bg-transparent border-none p-0 w-full outline-none focus:outline-none',
                      // amountValidation.errorMessage
                      //   ? 'text-r-red-default'
                      //   : 'text-r-neutral-title-1'
                      'text-r-neutral-title-1'
                    )}
                    autoFocus
                    placeholder="$0"
                    value={usdValue ? `$${usdValue}` : ''}
                    onChange={handleInputChange}
                  />
                  <div
                    className={clsx(
                      'text-13 leading-[16px] mt-2 truncate',
                      // balanceCopy.isInsufficient
                      //   ? 'text-r-red-default'
                      //   : 'text-r-neutral-foot'
                      'text-r-neutral-foot'
                    )}
                  >
                    {amountTokenText}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTokenPickerVisible(true);
                  }}
                  className={clsx(
                    'flex items-center gap-6 px-12 h-[40px] justify-center rounded-[8px]',
                    'bg-r-neutral-card-2 border-none cursor-pointer'
                  )}
                >
                  {selectedToken ? (
                    <>
                      <TokenWithChain
                        token={selectedToken}
                        hideConer
                        width="24px"
                        height="24px"
                      />
                      <span className="text-[18px] font-medium text-r-neutral-title-1 max-w-[92px] truncate">
                        {getTokenSymbol(selectedToken)}
                      </span>
                    </>
                  ) : (
                    <span className="text-13 font-medium text-r-neutral-title-1">
                      {t('page.gasAccount.depositPopup.selectToken')}
                    </span>
                  )}
                  <ThemeIcon
                    className="icon icon-arrow-right text-r-neutral-foot"
                    src={RcIconArrowDownCC}
                  />
                </button>
              </div>
            </div>

            {hasQuickAmountOptions ? (
              <div className="flex items-center gap-8 mt-8">
                {quickDepositButtons.map((button) => {
                  const isActive = new BigNumber(usdValue || 0).eq(
                    button.value
                  );

                  return (
                    <button
                      key={button.key}
                      type="button"
                      className={clsx(
                        'flex-1 h-[40px] flex items-center justify-center rounded-[8px] border border-solid text-13 font-medium',
                        isActive
                          ? 'border-rabby-blue-default bg-r-blue-light1 text-r-blue-default'
                          : 'border-transparent text-r-neutral-title-1 bg-r-neutral-card1 hover:border-rabby-blue-default hover:bg-r-blue-light1 hover:text-r-blue-default'
                      )}
                      onClick={() => {
                        handleQuickAmountClick(button.value);
                      }}
                    >
                      {button.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div
              className={clsx(
                'min-h-[36px]',
                hasQuickAmountOptions ? 'mt-8' : 'mt-10'
              )}
            >
              {infoText ? (
                <div className="text-13 leading-[18px] text-r-red-default">
                  {infoText}
                </div>
              ) : selectedToken ? (
                shouldShowReceiveMetrics ? (
                  <div className="flex items-center gap-4 text-13 leading-[18px] text-r-neutral-foot">
                    {quoteLoading ? (
                      <Skeleton.Button
                        active
                        className="h-[18px] rounded-[4px]"
                        style={{ width: 160 }}
                      />
                    ) : (
                      <span>{displayedEstReceiveLabel}</span>
                    )}
                    {selectedToken.gasAccountDepositType === 'bridge' &&
                    !quoteLoading ? (
                      <Tooltip
                        overlayClassName={clsx('rectangle')}
                        placement="top"
                        title={
                          <div className="max-w-[300px]">
                            <div>{estReceiveLabel}</div>
                            <div>{estReceiveTip}</div>
                          </div>
                        }
                      >
                        <span className="inline-flex items-center">
                          <RcIconInfo className="w-14 h-14 text-r-neutral-foot" />
                        </span>
                      </Tooltip>
                    ) : null}
                  </div>
                ) : null
              ) : null}
            </div>
          </div>

          <div className="h-[80px] shrink-0 border-t-[0.5px] border-solid border-rabby-neutral-line px-20 flex items-center">
            <Button
              loading={loading}
              onClick={handleSubmit}
              disabled={!canSubmit}
              size="large"
              type="primary"
              className="w-full h-[48px] rounded-[6px] text-[15px] font-medium"
            >
              {t('page.gasAccount.depositPopup.title')}
            </Button>
          </div>

          <GasAccountDepositTokenPicker
            visible={tokenPickerVisible}
            onCancel={() => setTokenPickerVisible(false)}
            onSelect={(token) => {
              setSelectedToken(token);
            }}
            availableTokens={availableTokens}
            isCheckingAvailability={isCheckingAvailability}
          />
        </div>
      </PopupContainer>
    </Popup>
  );
};
