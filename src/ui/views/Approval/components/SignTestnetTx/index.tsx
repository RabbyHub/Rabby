import { Account, ChainGas } from 'background/service/preference';
import React, { ReactNode, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { findChain } from '@/utils/chain';
import BigNumber from 'bignumber.js';
import { FooterBar } from '../FooterBar/FooterBar';
import {
  intToHex,
  useApproval,
  useCommonPopupView,
  useWallet,
} from '@/ui/utils';
import { useMount, useRequest } from 'ahooks';
import {
  ALIAS_ADDRESS,
  DEFAULT_GAS_LIMIT_BUFFER,
  DEFAULT_GAS_LIMIT_RATIO,
  HARDWARE_KEYRING_TYPES,
  KEYRING_CATEGORY_MAP,
  KEYRING_CLASS,
  KEYRING_TYPE,
  MINIMUM_GAS_LIMIT,
  SAFE_GAS_LIMIT_BUFFER,
} from '@/constant';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { GasLevel, Tx } from '@rabby-wallet/rabby-api/dist/types';
import { normalizeTxParams } from '../SignTx';
import { isHexString, toChecksumAddress } from '@ethereumjs/util';
import { WaitingSignComponent } from '../map';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';
import { matomoRequestEvent } from '@/utils/matomo-request';
import i18n from '@/i18n';
import GasSelectorHeader, {
  GasSelectorResponse,
} from '../TxComponents/GasSelectorHeader';
import { MessageWrapper } from '../TextActions';
import { Card } from '../Card';
import { SignAdvancedSettings } from '../SignAdvancedSettings';
import clsx from 'clsx';
import { Modal } from 'antd';
import { ga4 } from '@/utils/ga4';
import { TestnetActions } from './Actions';
import {
  ActionRequireData,
  fetchActionRequiredData,
  parseAction,
  ParsedTransactionActionData,
} from '@rabby-wallet/rabby-action';
import * as Sentry from '@sentry/browser';
import { getCexInfo } from '@/ui/models/exchange';

const checkGasAndNonce = ({
  recommendGasLimitRatio,
  recommendGasLimit,
  recommendNonce,
  tx,
  gasLimit,
  nonce,
  isCancel,
  maxGasCostAmount,
  isSpeedUp,
  isGnosisAccount,
  nativeTokenBalance,
}: {
  recommendGasLimitRatio: number;
  nativeTokenBalance: string;
  recommendGasLimit: number | string | BigNumber;
  recommendNonce: number | string | BigNumber;
  tx: Tx;
  gasLimit: number | string | BigNumber;
  nonce: number | string | BigNumber;
  maxGasCostAmount: number | string | BigNumber;
  isCancel: boolean;
  isSpeedUp: boolean;
  isGnosisAccount: boolean;
}) => {
  const errors: {
    code: number;
    msg: string;
    level?: 'warn' | 'danger' | 'forbidden';
  }[] = [];
  if (!isGnosisAccount && new BigNumber(gasLimit).lt(MINIMUM_GAS_LIMIT)) {
    errors.push({
      code: 3006,
      msg: i18n.t('page.signTx.gasLimitNotEnough'),
      level: 'forbidden',
    });
  }
  if (
    !isGnosisAccount &&
    new BigNumber(gasLimit).lt(
      new BigNumber(recommendGasLimit).times(recommendGasLimitRatio)
    ) &&
    new BigNumber(gasLimit).gte(21000)
  ) {
    if (recommendGasLimitRatio === DEFAULT_GAS_LIMIT_RATIO) {
      const realRatio = new BigNumber(gasLimit).div(recommendGasLimit);
      if (realRatio.lt(DEFAULT_GAS_LIMIT_RATIO) && realRatio.gt(1)) {
        errors.push({
          code: 3004,
          msg: i18n.t('page.signTx.gasLimitLessThanExpect'),
          level: 'warn',
        });
      } else if (realRatio.lt(1)) {
        errors.push({
          code: 3005,
          msg: i18n.t('page.signTx.gasLimitLessThanGasUsed'),
          level: 'danger',
        });
      }
    } else {
      if (new BigNumber(gasLimit).lt(recommendGasLimit)) {
        errors.push({
          code: 3004,
          msg: i18n.t('page.signTx.gasLimitLessThanExpect'),
          level: 'warn',
        });
      }
    }
  }
  let sendNativeTokenAmount = new BigNumber(tx.value); // current transaction native token transfer count
  sendNativeTokenAmount = isNaN(sendNativeTokenAmount.toNumber())
    ? new BigNumber(0)
    : sendNativeTokenAmount;
  if (
    !isGnosisAccount &&
    new BigNumber(maxGasCostAmount)
      .plus(sendNativeTokenAmount.div(1e18))
      .isGreaterThan(new BigNumber(nativeTokenBalance).div(1e18))
  ) {
    errors.push({
      code: 3001,
      msg: i18n.t('page.signTx.nativeTokenNotEngouthForGas'),
      level: 'forbidden',
    });
  }
  if (new BigNumber(nonce).lt(recommendNonce) && !(isCancel || isSpeedUp)) {
    errors.push({
      code: 3003,
      msg: i18n.t('page.signTx.nonceLowerThanExpect', [
        new BigNumber(recommendNonce),
      ]),
    });
  }
  return errors;
};

const useCheckGasAndNonce = ({
  recommendGasLimitRatio,
  recommendGasLimit,
  recommendNonce,
  tx,
  gasLimit,
  nonce,
  isCancel,
  maxGasCostAmount,
  isSpeedUp,
  isGnosisAccount,
  nativeTokenBalance,
}: Parameters<typeof checkGasAndNonce>[0]) => {
  return useMemo(
    () =>
      checkGasAndNonce({
        recommendGasLimitRatio,
        recommendGasLimit,
        recommendNonce,
        tx,
        gasLimit,
        nonce,
        isCancel,
        maxGasCostAmount,
        isSpeedUp,
        isGnosisAccount,
        nativeTokenBalance,
      }),
    [
      recommendGasLimit,
      recommendNonce,
      tx,
      gasLimit,
      nonce,
      isCancel,
      maxGasCostAmount,
      isSpeedUp,
      isGnosisAccount,
      nativeTokenBalance,
    ]
  );
};
interface SignTxProps<TData extends any[] = any[]> {
  params: {
    session: {
      origin: string;
      icon: string;
      name: string;
    };
    data: TData;
    isGnosis?: boolean;
    account?: Account;
    $ctx?: any;
  };
  origin?: string;
  account: Account;
}

export const SignTestnetTx = ({
  params,
  origin,
  account: $account,
}: SignTxProps) => {
  const { isGnosis } = params;
  const currentAccount = params.isGnosis ? params.account! : $account;

  const {
    data = '0x',
    from,
    gas,
    gasPrice,
    nonce,
    to,
    value,
    maxFeePerGas,
    isSpeedUp,
    isCancel,
    isSend,
    isSwap,
    isBridge,
    swapPreferMEVGuarded,
    isViewGnosisSafe,
    reqId,
    safeTxGas,
  } = normalizeTxParams(params.data[0]);

  const wallet = useWallet();
  const chainId = +params?.data?.[0]?.chainId;
  const chain = chainId ? findChain({ id: +chainId }) : undefined;

  const [realNonce, setRealNonce] = useState('');
  const [gasLimit, setGasLimit] = useState<string | undefined>(undefined);
  const [selectedGas, setSelectedGas] = useState<GasLevel | null>(null);
  const [isGnosisAccount, setIsGnosisAccount] = useState(false);
  const [isCoboArugsAccount, setIsCoboArugsAccount] = useState(false);
  const [nonceChanged, setNonceChanged] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLedger, setIsLedger] = useState(false);
  const [isHardware, setIsHardware] = useState(false);
  const [nativeTokenBalance, setNativeTokenBalance] = useState('0x0');
  const [canProcess, setCanProcess] = useState(true);
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();
  let updateNonce = true;
  if (isCancel || isSpeedUp || (nonce && from === to) || nonceChanged)
    updateNonce = false;

  const getGasPrice = () => {
    let result = '';
    if (maxFeePerGas) {
      result = isHexString(maxFeePerGas)
        ? maxFeePerGas
        : intToHex(maxFeePerGas);
    }
    if (gasPrice) {
      result = isHexString(gasPrice) ? gasPrice : intToHex(parseInt(gasPrice));
    }
    if (Number.isNaN(Number(result))) {
      result = '';
    }
    return result;
  };

  const [tx, setTx] = useState<Tx>({
    chainId,
    data: data || '0x', // can not execute with empty string, use 0x instead
    from,
    gas: gas || params.data[0].gasLimit,
    gasPrice: getGasPrice(),
    nonce,
    to: to ? toChecksumAddress(to) : to,
    value,
  });

  const { data: recommendNonce, runAsync: runGetNonce } = useRequest(
    async () => {
      return wallet.getCustomTestnetNonce({
        address: currentAccount.address,
        chainId: chainId,
      });
    },
    {
      manual: true,
    }
  );

  const { data: gasUsed, runAsync: runGetGasUsed } = useRequest(
    async () => {
      try {
        let estimateGas = await wallet.estimateCustomTestnetGas({
          address: currentAccount.address,
          chainId: chainId,
          tx: tx,
        });
        const blockGasLimit = await wallet.getCustomBlockGasLimit(chainId);

        let recommendGasLimit = estimateGas;

        if (!gasLimit) {
          recommendGasLimit = new BigNumber(estimateGas)
            .times(DEFAULT_GAS_LIMIT_RATIO)
            .toFixed(0);

          if (
            blockGasLimit &&
            new BigNumber(recommendGasLimit).gt(blockGasLimit)
          ) {
            const buffer =
              SAFE_GAS_LIMIT_BUFFER[chainId] || DEFAULT_GAS_LIMIT_BUFFER;

            estimateGas = blockGasLimit;
            recommendGasLimit = new BigNumber(blockGasLimit)
              .times(buffer)
              .toFixed(0);
          }
          if (tx.gas || tx.gasLimit) {
            recommendGasLimit = Math.max(
              Number(tx.gas || tx.gasLimit),
              Number(recommendGasLimit)
            ).toString();
          }
          setGasLimit(
            `0x${new BigNumber(recommendGasLimit).integerValue().toString(16)}`
          );
        }
        return `0x${new BigNumber(estimateGas).integerValue().toString(16)}`;
      } catch (e) {
        console.error(e);
        const fallbackNumber = 2000000;
        const fallback = intToHex(fallbackNumber);
        if (!gasLimit) {
          const dappSetGasLimit = Number(tx.gas || tx.gasLimit || 0);
          setGasLimit(intToHex(Math.max(dappSetGasLimit, fallbackNumber)));
        }
        return fallback;
      }
    },
    {
      manual: true,
    }
  );

  const {
    loading: isLoadingGasMarket,
    data: gasList,
    mutate: setGasList,
    runAsync: runGetGasMarket,
  } = useRequest(
    async (custom: number) => {
      return wallet.getCustomTestnetGasMarket({
        chainId,
        custom,
      });
    },
    {
      manual: true,
    }
  );

  const {
    data: lastTimeGas,
    runAsync: runGetLastTimeGasSelection,
  } = useRequest(
    () => {
      return wallet.getLastTimeGasSelection(chainId);
    },
    {
      manual: true,
    }
  );

  const init = async () => {
    try {
      setIsLedger(currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER);
      setIsHardware(
        !!Object.values(HARDWARE_KEYRING_TYPES).find(
          (item) => item.type === currentAccount.type
        )
      );
      wallet.reportStats('createTransaction', {
        type: currentAccount.brandName,
        category: KEYRING_CATEGORY_MAP[currentAccount.type],
        chainId: chain?.serverId || '',
        createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
        source: params?.$ctx?.ga?.source || '',
        trigger: params?.$ctx?.ga?.trigger || '',
        networkType: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
        swapUseSlider: params?.$ctx?.ga?.swapUseSlider ?? '',
      });

      matomoRequestEvent({
        category: 'Transaction',
        action: 'init',
        label: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
      });
      ga4.fireEvent(`Init_${chain?.isTestnet ? 'Custom' : 'Integrated'}`, {
        event_category: 'Transaction',
      });

      if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
        setIsGnosisAccount(true);
      }
      if (currentAccount.type === KEYRING_TYPE.CoboArgusKeyring) {
        setIsCoboArugsAccount(true);
      }
      checkCanProcess();
      try {
        const balance = await wallet.getCustomTestnetToken({
          chainId,
          address: currentAccount.address,
        });

        setNativeTokenBalance(balance.rawAmount);
      } catch (e) {
        console.error(e);
        if (chain && (await wallet.hasCustomRPC(chain.enum))) {
          triggerCustomRPCErrorModal();
        }
      }
      let customGasPrice = 0;
      const lastTimeGas = await runGetLastTimeGasSelection();
      if (lastTimeGas?.lastTimeSelect === 'gasPrice' && lastTimeGas.gasPrice) {
        // use cached gasPrice if exist
        customGasPrice = lastTimeGas.gasPrice;
      }
      if (
        isSpeedUp ||
        isCancel ||
        ((isSend || isSwap || isBridge) && tx.gasPrice)
      ) {
        // use gasPrice set by dapp when it's a speedup or cancel tx
        customGasPrice = parseInt(tx.gasPrice!);
      }
      const gasUsed = await runGetGasUsed();
      const recommendNonce = await runGetNonce();
      if (updateNonce) {
        setRealNonce(intToHex(recommendNonce));
      }
      const gasList = await runGetGasMarket(customGasPrice);
      // const median = gasList.find((item) => item.level === 'normal');
      let gas: GasLevel | null = null;

      if (
        ((isSend || isSwap || isBridge) && customGasPrice) ||
        isSpeedUp ||
        isCancel ||
        lastTimeGas?.lastTimeSelect === 'gasPrice'
      ) {
        gas = gasList.find((item) => item.level === 'custom')!;
      } else if (
        lastTimeGas?.lastTimeSelect &&
        lastTimeGas?.lastTimeSelect === 'gasLevel'
      ) {
        const target = gasList.find(
          (item) => item.level === lastTimeGas?.gasLevel
        )!;
        if (target) {
          gas = target;
        } else {
          gas = gasList.find((item) => item.level === 'normal')!;
        }
      } else {
        // no cache, use the fast level in gasMarket
        gas = gasList.find((item) => item.level === 'normal')!;
      }
      setSelectedGas(gas);
      setTx({
        ...tx,
        gasPrice: intToHex(gas.price),
      });
      await explainTx({
        gasUsed,
        tx: {
          ...tx,
          gasPrice: intToHex(gas.price),
        },
      });
      setIsReady(true);
    } catch (e) {
      console.error(e);
      if (!customRPCErrorModalRef.current) {
        Modal.error({
          className: 'modal-support-darkmode',
          title: 'Error',
          content: e.details || e.message || JSON.stringify(e),
          closable: false,
          maskClosable: false,
          onOk() {
            rejectApproval('');
          },
        });
      }
      Sentry.captureException(e);
    }
  };

  const customRPCErrorModalRef = useRef(false);
  const triggerCustomRPCErrorModal = () => {
    if (customRPCErrorModalRef.current) return;
    customRPCErrorModalRef.current = true;
    Modal.error({
      className: 'modal-support-darkmode',
      closable: true,
      title: t('page.signTx.customRPCErrorModal.title'),
      content: t('page.signTx.customRPCErrorModal.content'),
      okText: t('page.signTx.customRPCErrorModal.button'),
      okButtonProps: {
        className: 'w-[280px]',
      },
      async onOk() {
        if (chain) {
          await wallet.setRPCEnable(chain.enum, false);
          location.reload();
        }
      },
    });
  };

  const { data: explainResult, runAsync: explainTx } = useRequest(
    async ({ gasUsed, tx }: { gasUsed?: string; tx: Tx }) => {
      try {
        if (!chain) {
          return;
        }
        const actionData = await wallet.parseCustomNetworkTx({
          chainId: chain.id,
          tx: {
            ...tx,
            gas: '0x0',
            value: tx.value || '0x0',
            to: tx.to || '',
          },
          origin: origin || '',
          addr: currentAccount.address,
        });

        if (!actionData) {
          return;
        }

        const parsed = parseAction({
          type: 'transaction',
          data: actionData.action,
          balanceChange: {} as any,
          tx: {
            ...tx,
            gas: '0x0',

            value: tx.value || '0x0',
          },
          preExecVersion: 'v0',
          gasUsed: gasUsed ? Number(gasUsed) : 0,
          sender: tx.from,
        });

        const cexInfo = await getCexInfo(parsed.send?.to || '', wallet);
        const requiredData = await fetchActionRequiredData({
          type: 'transaction',
          actionData: parsed,
          contractCall: actionData.contract_call,
          chainId: chain.serverId,
          sender: currentAccount.address,
          walletProvider: {
            findChain,
            ALIAS_ADDRESS,
            hasPrivateKeyInWallet: wallet.hasPrivateKeyInWallet,
            hasAddress: wallet.hasAddress,
            getWhitelist: wallet.getWhitelist,
            isWhitelistEnabled: wallet.isWhitelistEnabled,
            getPendingTxsByNonce: wallet.getPendingTxsByNonce,
          },
          cex: cexInfo,
          tx: {
            ...tx,
            gas: '0x0',
            // nonce: (updateNonce ? recommendNonce : tx.nonce) || '0x1',
            value: tx.value || '0x0',
          },
          // todo fake api provider
          apiProvider: (wallet.fakeTestnetOpenapi as unknown) as any,
        });

        return {
          actionData: parsed,
          requiredData,
        };
      } catch (e) {
        console.error(e);
      }
    },
    {
      manual: true,
      onFinally() {
        console.log('finally');
      },
      onError(e) {
        console.log(e);
        Modal.error({
          title: 'Error',
          content: e.message || JSON.stringify(e),
          className: 'modal-support-darkmode',
        });
        Sentry.captureException(e);
      },
    }
  );

  useMount(() => {
    init();
  });

  const { t } = useTranslation();

  const [getApproval, resolveApproval, rejectApproval] = useApproval();

  const checkCanProcess = async () => {
    const session = params.session;
    const site = await wallet.getConnectedSite(session.origin);

    if (currentAccount.type === KEYRING_TYPE.WatchAddressKeyring) {
      setCanProcess(false);
      setCantProcessReason(
        <div>{t('page.signTx.canOnlyUseImportedAddress')}</div>
      );
    }
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring || isGnosis) {
      setCanProcess(false);
      setCantProcessReason(
        <div className="flex items-center gap-6">
          <img src={IconGnosis} alt="" className="w-[24px] flex-shrink-0" />
          {t('page.signTx.multiSigChainNotMatch')}
        </div>
      );
    }
  };

  const handleGasChange = (gas: GasSelectorResponse) => {
    setSelectedGas({
      level: gas.level,
      front_tx_count: gas.front_tx_count,
      estimated_seconds: gas.estimated_seconds,
      base_fee: gas.base_fee,
      price: Math.round(gas.price),
      priority_price: gas.priority_price,
    });
    if (gas.level === 'custom') {
      setGasList(
        (gasList || []).map((item) => {
          if (item.level === 'custom') return gas;
          return item;
        })
      );
    }
    const beforeNonce = realNonce || tx.nonce;
    const afterNonce = intToHex(gas.nonce);

    setTx({
      ...tx,
      gasPrice: intToHex(Math.round(gas.price)),
      gas: intToHex(gas.gasLimit),
      nonce: afterNonce,
    });

    setGasLimit(intToHex(gas.gasLimit));
    setRealNonce(`0x${new BigNumber(afterNonce).toString(16)}`);
    if (beforeNonce !== afterNonce) {
      setNonceChanged(true);
    }
  };

  const handleAdvancedSettingsChange = (gas: GasSelectorResponse) => {
    const beforeNonce = realNonce || tx.nonce;
    const afterNonce = intToHex(gas.nonce);
    setTx({
      ...tx,
      gas: intToHex(gas.gasLimit),
      nonce: afterNonce,
    });
    setGasLimit(intToHex(gas.gasLimit));

    if (!isGnosisAccount) {
      setRealNonce(afterNonce);
    }

    if (beforeNonce !== afterNonce) {
      setNonceChanged(true);
    }
  };

  const handleTxChange = async (obj: Record<string, any>) => {
    setTx({
      ...tx,
      ...obj,
    });
    try {
      setIsReady(false);
      // trigger explain
      await explainTx({
        gasUsed,
        tx: {
          ...tx,
          ...obj,
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsReady(true);
    }
  };

  const handleCancel = () => {
    //  gaEvent('cancel');
    rejectApproval('User rejected the request.');
  };

  const { activeApprovalPopup } = useCommonPopupView();
  const invokeEnterPassphrase = useEnterPassphraseModal('address');

  const handleAllow = async () => {
    if (!selectedGas) {
      return;
    }

    if (activeApprovalPopup()) {
      return;
    }

    if (currentAccount?.type === KEYRING_TYPE.HdKeyring) {
      await invokeEnterPassphrase(currentAccount.address);
    }

    const selected: ChainGas = {
      lastTimeSelect: selectedGas.level === 'custom' ? 'gasPrice' : 'gasLevel',
    };
    if (selectedGas.level === 'custom') {
      selected.gasPrice = parseInt(tx.gasPrice!);
    } else {
      selected.gasLevel = selectedGas.level;
    }
    if (!isSpeedUp && !isCancel && !isSwap) {
      await wallet.updateLastTimeGasSelection(chainId, selected);
    }
    const transaction: Tx = {
      from: tx.from,
      to: tx.to,
      data: tx.data,
      nonce: tx.nonce,
      value: tx.value,
      chainId: tx.chainId,
      gas: '',
    };

    (transaction as Tx).gasPrice = tx.gasPrice;
    const approval = await getApproval();

    approval.signingTxId &&
      (await wallet.updateSigningTx(approval.signingTxId, {
        rawTx: {
          nonce: realNonce || tx.nonce,
        },
        action: explainResult,
      }));

    if (currentAccount?.type && WaitingSignComponent[currentAccount.type]) {
      resolveApproval({
        ...transaction,
        isSend,
        nonce: realNonce || tx.nonce,
        gas: gasLimit,
        uiRequestComponent: WaitingSignComponent[currentAccount.type],
        $account: currentAccount,
        type: currentAccount.type,
        address: currentAccount.address,
        // traceId: txDetail?.trace_id,
        extra: {
          brandName: currentAccount.brandName,
        },
        $ctx: params.$ctx,
        signingTxId: approval.signingTxId,
        // pushType: pushInfo.type,
        // lowGasDeadline: pushInfo.lowGasDeadline,
        reqId,
      });

      return;
    }
    // if (isGnosisAccount || isCoboArugsAccount) {
    //   setDrawerVisible(true);
    //   return;
    // }

    await wallet.reportStats('signTransaction', {
      type: currentAccount.brandName,
      chainId: chain?.serverId || '',
      category: KEYRING_CATEGORY_MAP[currentAccount.type],
      preExecSuccess: true,
      createdBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
      source: params?.$ctx?.ga?.source || '',
      trigger: params?.$ctx?.ga?.trigger || '',
      networkType: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
    });

    matomoRequestEvent({
      category: 'Transaction',
      action: 'Submit',
      label: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
    });

    ga4.fireEvent(`Submit_${chain?.isTestnet ? 'Custom' : 'Integrated'}`, {
      event_category: 'Transaction',
    });

    resolveApproval({
      ...transaction,
      nonce: realNonce || tx.nonce,
      gas: gasLimit,
      isSend,
      signingTxId: approval.signingTxId,
      reqId,
    });
  };

  const checkErrors = useCheckGasAndNonce({
    recommendGasLimit: gasUsed || 0,
    recommendNonce: recommendNonce || '',
    gasLimit: Number(gasLimit),
    nonce: Number(realNonce || tx.nonce),
    maxGasCostAmount: new BigNumber(selectedGas?.price || 0)
      .multipliedBy(gasLimit || 0)
      .div(1e18),
    isSpeedUp,
    isCancel,
    tx,
    isGnosisAccount: isGnosisAccount || isCoboArugsAccount,
    nativeTokenBalance,
    recommendGasLimitRatio: 1.5,
  });

  if (!chain) {
    return null;
  }

  return (
    <>
      <div className="approval-tx overflow-x-hidden">
        <TestnetActions
          account={currentAccount}
          data={explainResult?.actionData || {}}
          requireData={explainResult?.requiredData || null}
          isReady={isReady}
          chain={chain}
          raw={{
            ...tx,
            nonce: realNonce || tx.nonce,
            gas: gasLimit!,
          }}
          isSpeedUp={isSpeedUp}
          originLogo={params.session.icon}
          origin={params.session.origin}
          onChange={handleTxChange}
        />

        {isReady && (
          <SignAdvancedSettings
            isReady={isReady}
            gasLimit={gasLimit}
            recommendGasLimit={gasUsed || ''}
            recommendNonce={recommendNonce || ''}
            onChange={handleAdvancedSettingsChange}
            nonce={realNonce || tx.nonce}
            disableNonce={isSpeedUp || isCancel}
            manuallyChangeGasLimit={false}
          />
        )}

        {isReady && (
          <div
            className={clsx(
              'w-[186px]',
              'ml-auto',
              'px-[16px] py-[12px] rotate-[-23deg]',
              'border-rabby-neutral-title1 border-[1px] rounded-[6px]',
              'text-r-neutral-title1 text-[20px] leading-[24px]',
              'opacity-30',
              'absolute bottom-[210px] right-[16px] pointer-events-none'
            )}
          >
            Custom Network
          </div>
        )}
      </div>
      <FooterBar
        Header={
          <GasSelectorHeader
            tx={tx}
            disabled={false}
            isReady={isReady}
            gasLimit={gasLimit}
            noUpdate={isCancel || isSpeedUp}
            gasList={gasList || []}
            selectedGas={selectedGas}
            version={'v0'}
            gas={{
              error: null,
              success: true,
              gasCostUsd: 0,
              gasCostAmount: new BigNumber(selectedGas?.price || 0)
                .multipliedBy(gasUsed || 0)
                .div(1e18),
            }}
            gasCalcMethod={async (price) => {
              return {
                gasCostAmount: new BigNumber(price || 0)
                  .multipliedBy(gasUsed || 0)
                  .div(1e18),
                gasCostUsd: new BigNumber(0),
              };
            }}
            recommendGasLimit={gasUsed || ''}
            recommendNonce={recommendNonce || ''}
            chainId={chainId}
            onChange={handleGasChange}
            nonce={realNonce || tx.nonce}
            disableNonce={isSpeedUp || isCancel}
            isSpeedUp={isSpeedUp}
            isCancel={isCancel}
            is1559={false}
            isHardware={isHardware}
            manuallyChangeGasLimit={false}
            errors={checkErrors}
            engineResults={[]}
            nativeTokenBalance={nativeTokenBalance}
            gasPriceMedian={null}
          />
        }
        // hasShadow={footerShowShadow}
        origin={origin}
        originLogo={params.session.icon}
        // hasUnProcessSecurityResult={hasUnProcessSecurityResult}
        // securityLevel={securityLevel}
        // gnosisAccount={isGnosis ? account : undefined}
        chain={chain}
        isTestnet={chain.isTestnet}
        onCancel={handleCancel}
        onSubmit={handleAllow}
        onIgnoreAllRules={() => {}}
        enableTooltip={
          !canProcess ||
          !!checkErrors.find((item) => item.level === 'forbidden')
        }
        tooltipContent={
          checkErrors.find((item) => item.level === 'forbidden')
            ? checkErrors.find((item) => item.level === 'forbidden')!.msg
            : cantProcessReason
        }
        disabledProcess={
          !isReady ||
          (selectedGas ? selectedGas.price < 0 : true) ||
          isGnosisAccount ||
          isCoboArugsAccount ||
          !canProcess ||
          !!checkErrors.find((item) => item.level === 'forbidden')
        }
        account={currentAccount}
      />
    </>
  );
};
