import { Popup, TokenWithChain } from '@/ui/component';
import { PopupContainer } from '@/ui/hooks/usePopupContainer';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { useMiniSigner } from '@/ui/hooks/useSigner';
import { formatUsdValue } from '@/ui/utils/number';
import { getTokenSymbol } from '@/ui/utils/token';
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
import { useDebounce } from 'react-use';
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
  getDepositMaxUsdValue,
  getMinDepositUsdValue,
} from './GasAccountDepositTokenForm.utils';
import {
  buildGasAccountBridgeTxs,
  buildTopUpGasAccount,
  fetchGasAccountTopUpUsedNonce,
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
const GAS_ACCOUNT_DEPOSIT_POPUP_HEIGHT = 320;
const POST_DEPOSIT_REFRESH_DELAYS = [1500, 5000, 10000];

const parseTopUpNonce = (nonce: string) =>
  nonce.startsWith('0x') ? parseInt(nonce, 16) : parseInt(nonce, 10);

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
  const { allSortedAccountList } = useAccounts();

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
    checkIsExpireAndUpdate,
  } = useGasAccountDepositAvailableTokens({
    minDepositPrice,
    disableDirectDeposit,
    maxAccountCount,
  });

  const refreshAvailableTokens = useCallback(async () => {
    await checkIsExpireAndUpdate();
  }, [checkIsExpireAndUpdate]);

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
        if (!ownerAccount) {
          return false;
        }

        if (!isInTxFlow) {
          return true;
        }

        return supportedDirectSign(ownerAccount.type);
      }),
    [isInTxFlow, ownerAccountMap, rawAvailableTokens]
  );

  const eligibleAccounts = useMemo(
    () =>
      allSortedAccountList.filter((account) =>
        availableTokens.some((token) =>
          isSameAddress(token.owner_addr, account.address)
        )
      ) as Account[],
    [allSortedAccountList, availableTokens]
  );

  const [usdValue, setUsdValue] = useState('');
  const [selectedToken, setSelectedToken] = useState<
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
  const pollCancelRef = useRef<(() => void) | null>(null);

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
    if (!visible) {
      setUsdValue('');
      setTokenPickerVisible(false);
      setQuoteLoading(false);
      setBridgeQuote(null);
      setQuoteAmountValue(null);
      setBridgeQuoteError('');
      setLoading(false);
      return;
    }

    if (!usdValue) {
      setUsdValue(
        new BigNumber(getMinDepositUsdValue(minDepositPrice)).toFixed(
          2,
          BigNumber.ROUND_CEIL
        )
      );
    }
  }, [minDepositPrice, usdValue, visible]);

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

    setSelectedToken((current) => {
      if (!current) {
        return availableTokens[0];
      }

      const matched = availableTokens.find(
        (item) =>
          isSameAddress(item.owner_addr, current.owner_addr) &&
          item.chain === current.chain &&
          isSameAddress(item.id, current.id)
      );

      return matched || availableTokens[0];
    });
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

  const amountValue = Number(usdValue || 0);
  const canUseMiniSign = selectedOwnerAccount?.type
    ? supportedDirectSign(selectedOwnerAccount.type)
    : false;
  const minDepositUsd = useMemo(() => getMinDepositUsdValue(minDepositPrice), [
    minDepositPrice,
  ]);
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

  const resetBridgeQuoteState = useCallback(() => {
    setBridgeQuote(null);
    setQuoteAmountValue(null);
    setBridgeQuoteError('');
    setQuoteLoading(false);
  }, []);

  useEffect(() => {
    if (
      !visible ||
      !isBridgeDeposit ||
      !selectedToken ||
      !selectedOwnerAccount ||
      !amountValidation.isValid
    ) {
      quoteReqIdRef.current += 1;
      resetBridgeQuoteState();
    }
  }, [
    amountValidation.isValid,
    isBridgeDeposit,
    resetBridgeQuoteState,
    selectedOwnerAccount,
    selectedToken,
    visible,
  ]);

  useDebounce(
    () => {
      if (
        loading ||
        !visible ||
        !isBridgeDeposit ||
        !selectedToken ||
        !selectedOwnerAccount ||
        !amountValidation.isValid
      ) {
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
      loading,
      amountValidation.isValid,
      amountValue,
      isBridgeDeposit,
      selectedBridgeQuoteTokenKey,
      selectedOwnerAddress,
      validationMessages.fetchQuoteFailed,
      visible,
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

  const quoteError = useMemo(() => {
    if (!isBridgeDeposit || !amountValidation.isValid || quoteLoading) {
      return '';
    }
    return bridgeQuoteError;
  }, [
    amountValidation.isValid,
    bridgeQuoteError,
    isBridgeDeposit,
    quoteLoading,
  ]);

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
    balanceLabel: t('page.gasAccount.depositPopup.balanceLabel', {
      defaultValue: 'Balance',
    }),
    insufficientBalanceLabel: validationMessages.insufficientBalanceLabel,
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

  const fetchTopUpUsedNonce = useCallback(
    async (txHash: string, chainServerId: string, account: Account) => {
      return fetchGasAccountTopUpUsedNonce({
        wallet,
        txHash,
        chainServerId,
        account,
      });
    },
    [wallet]
  );

  const schedulePostDepositStateRefresh = useCallback(() => {
    const runRefresh = () => {
      refreshGasAccount();
      refreshHistory();
    };

    runRefresh();

    POST_DEPOSIT_REFRESH_DELAYS.forEach((delay) => {
      setTimeout(runRefresh, delay);
    });
  }, [refreshGasAccount, refreshHistory]);

  const afterTopUpGasAccount = useCallback(
    async ({
      to: _to,
      chainServerId,
      tokenId: _tokenId,
      rawAmount: _rawAmount,
      amount,
      tx,
      account,
    }: {
      to: string;
      chainServerId: string;
      tokenId: string;
      rawAmount: string;
      amount: number;
      tx?: string;
      account: Account;
    }) => {
      if (!tx) {
        throw new Error('GasAccount top up tx failed');
      }

      const usedNonce =
        (await await wallet.getNonceByChain(
          account.address,
          findChainByServerID(chainServerId)!.id
        )) || 0;

      if (!usedNonce) {
        throw new Error('GasAccount top up nonce missing');
      }

      const gasAccountSession = await wallet.getGasAccountSig();
      if (!gasAccountSession?.sig || !gasAccountSession?.accountId) {
        throw new Error('GasAccount login failed');
      }

      await wallet.openapi.rechargeGasAccount({
        sig: gasAccountSession.sig,
        account_id: gasAccountSession.accountId,
        tx_id: tx,
        chain_id: chainServerId,
        amount,
        user_addr: account.address,
        nonce: usedNonce,
      });
    },
    [fetchTopUpUsedNonce, wallet]
  );

  const topUpGasAccount = useCallback(
    async ({
      to,
      chainServerId,
      tokenId,
      rawAmount,
      amount,
      account,
    }: {
      to: string;
      chainServerId: string;
      tokenId: string;
      rawAmount: string;
      amount: number;
      account: Account;
    }) => {
      const tx = await buildTopUpGasAccount({
        to,
        chainServerId,
        tokenId,
        rawAmount,
        account,
      });

      const txHash = await wallet.sendRequest<string>(
        {
          method: 'eth_sendTransaction',
          params: [tx],
          $ctx: {
            ga: {
              category: 'GasAccount',
              action: 'deposit',
            },
          },
        },
        {
          account,
        }
      );

      await afterTopUpGasAccount({
        to,
        chainServerId,
        tokenId,
        rawAmount,
        amount,
        tx: txHash,
        account,
      });

      return txHash;
    },
    [afterTopUpGasAccount, wallet]
  );

  const sendBridgeTxsDirectly = useCallback(
    async (txs: Tx[], account: Account) => {
      let lastHash = '';

      for (const tx of txs) {
        lastHash = await wallet.sendRequest<string>(
          {
            method: 'eth_sendTransaction',
            params: [tx],
            $ctx: {
              ga: {
                category: 'GasAccount',
                action: 'deposit',
              },
            },
          },
          {
            account,
          }
        );
      }

      return lastHash;
    },
    [wallet]
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
      const gasAccountSession = await wallet.getGasAccountSig();
      if (!gasAccountSession?.sig || !gasAccountSession?.accountId) {
        throw new Error('GasAccount login failed');
      }

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
      } as any);
    },
    [wallet]
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
      if (!(await ensureGasAccountLogin(selectedOwnerAccount))) {
        return;
      }
      let depositTxHash = '';

      if (selectedToken.gasAccountDepositType === 'direct') {
        const depositAddress = getGasAccountDirectDepositAddress(
          selectedToken.chain
        );
        if (!depositAddress) {
          throw new Error('Gas account deposit address missing');
        }

        const params = {
          to: depositAddress,
          chainServerId: selectedToken.chain,
          tokenId: selectedToken.id,
          amount: amountValue,
          rawAmount: new BigNumber(amountValue)
            .times(10 ** selectedToken.decimals)
            .decimalPlaces(0, BigNumber.ROUND_DOWN)
            .toFixed(),
          account: selectedOwnerAccount,
        };

        if (canUseMiniSign) {
          const tx = await buildTopUpGasAccount(params);
          resetGasStore();
          closeSign();
          const hashes = await openUI({
            txs: [tx],
            ga: {
              category: 'GasAccount',
              action: 'deposit',
            },
            checkGasFeeTooHigh: true,
            autoUseGasFree: true,
          });

          const txHash = hashes?.[0];
          if (!txHash) {
            return;
          }

          await afterTopUpGasAccount({
            ...params,
            tx: txHash,
          });
          depositTxHash = txHash;
        } else {
          depositTxHash =
            (await topUpGasAccount({
              ...params,
            })) || '';
        }
      } else {
        if (!bridgeQuote?.tx || quoteAmountValue !== amountValue) {
          return;
        }

        const bridgeTxs = await buildGasAccountBridgeTxs({
          wallet,
          token: selectedToken,
          account: selectedOwnerAccount,
          quote: bridgeQuote,
          usdValue: amountValue,
        });

        if (canUseMiniSign) {
          resetGasStore();
          closeSign();
          const hashes = await openUI({
            txs: bridgeTxs,
            ga: {
              category: 'GasAccount',
              action: 'deposit',
            },
            checkGasFeeTooHigh: true,
            autoUseGasFree: true,
          });
          depositTxHash = hashes?.[hashes.length - 1] || '';
        } else {
          depositTxHash = await sendBridgeTxsDirectly(
            bridgeTxs,
            selectedOwnerAccount
          );
        }

        if (!depositTxHash) {
          return;
        }

        await afterBridgeTopUpGasAccount({
          chainServerId: selectedToken.chain,
          tokenId: selectedToken.id,
          tokenAmount: bridgeFromTokenAmount,
          usdValue: amountValue,
          txId: depositTxHash,
          account: selectedOwnerAccount,
          scene: onWaitDepositResult ? 'in_tx_flow' : 'recharge',
        });
      }

      if (onWaitDepositResult && depositTxHash) {
        const { promise: pollPromise, cancel } = pollDepositStatus({
          wallet,
          params: {
            from_chain_id: selectedToken.chain,
            tx_id: depositTxHash,
          },
          maxAttempts: PENDING_STATUS_MAX_ATTEMPTS,
        });
        pollCancelRef.current = cancel;
        const success = await pollPromise;
        pollCancelRef.current = null;

        if (success !== 'cancel') {
          if (success) {
            const usedNonce = await fetchTopUpUsedNonce(
              depositTxHash,
              selectedToken.chain,
              selectedOwnerAccount
            );

            await onWaitDepositResult({
              type: 'token',
              ownerAddress: selectedOwnerAccount.address,
              chainServerId: selectedToken.chain,
              usedNonce,
            });

            invalidateGasAccountDepositTokensCache(
              selectedOwnerAccount.address
            );
            await onDeposit?.();
          } else {
            message.info(
              t('page.gasAccount.depositFailed', {
                defaultValue: 'Deposit failed',
              })
            );
          }
        }

        if (success !== 'cancel') {
          schedulePostDepositStateRefresh();
        }
        onClose?.();
        return;
      }

      invalidateGasAccountDepositTokensCache(selectedOwnerAccount.address);
      schedulePostDepositStateRefresh();
      if (onDeposit) {
        await onDeposit();
      } else {
        message.success(
          t('page.gasAccount.depositPopup.depositSuccess', {
            defaultValue: 'Deposit successful',
          })
        );
      }
      onClose?.();
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
    accountId,
    amountValidation.isValid,
    amountValue,
    bridgeFromTokenAmount,
    bridgeQuote,
    canUseMiniSign,
    closeSign,
    afterBridgeTopUpGasAccount,
    afterTopUpGasAccount,
    ensureGasAccountLogin,
    fetchTopUpUsedNonce,
    onClose,
    onDeposit,
    onWaitDepositResult,
    openUI,
    quoteAmountValue,
    refreshHistory,
    resetGasStore,
    schedulePostDepositStateRefresh,
    selectedOwnerAccount,
    selectedToken,
    topUpGasAccount,
    t,
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
                      amountValidation.errorMessage
                        ? 'text-r-red-default'
                        : 'text-r-neutral-title-1'
                    )}
                    autoFocus
                    placeholder="$0"
                    value={usdValue ? `$${usdValue}` : ''}
                    onChange={handleInputChange}
                  />
                  <div
                    className={clsx(
                      'text-13 leading-[16px] mt-2 truncate',
                      balanceCopy.isInsufficient
                        ? 'text-r-red-default'
                        : 'text-r-neutral-foot'
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

            <div className="mt-10 min-h-[36px]">
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
