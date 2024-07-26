import { Account, ChainGas } from 'background/service/preference';
import React, { ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { findChain } from '@/utils/chain';
import { TestnetActions } from './components/TestnetActions';
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
  DEFAULT_GAS_LIMIT_RATIO,
  HARDWARE_KEYRING_TYPES,
  KEYRING_CATEGORY_MAP,
  KEYRING_CLASS,
  KEYRING_TYPE,
  MINIMUM_GAS_LIMIT,
} from '@/constant';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { GasLevel, Tx } from '@rabby-wallet/rabby-api/dist/types';
import { normalizeTxParams } from '../SignTx';
import { isHexString, toChecksumAddress } from 'ethereumjs-util';
import { WaitingSignComponent } from '../map';
import { useLedgerDeviceConnected } from '@/ui/utils/ledger';
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
}

export const SignTestnetTx = ({ params, origin }: SignTxProps) => {
  const { isGnosis, account } = params;

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
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
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
      const currentAccount = (await wallet.getCurrentAccount())!;
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
        const currentAccount = (await wallet.getCurrentAccount())!;
        const res = await wallet.estimateCustomTestnetGas({
          address: currentAccount.address,
          chainId: chainId,
          tx: tx,
        });
        if (!gasLimit) {
          setGasLimit(
            `0x${new BigNumber(res)
              .multipliedBy(1.5)
              .integerValue()
              .toString(16)}`
          );
        }
        return `0x${new BigNumber(res).integerValue().toString(16)}`;
      } catch (e) {
        console.error(e);
        const fallback = intToHex(2000000);
        if (!gasLimit) {
          setGasLimit(fallback);
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
    const currentAccount = (await wallet.getCurrentAccount())!;
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
    });

    matomoRequestEvent({
      category: 'Transaction',
      action: 'init',
      label: chain?.isTestnet ? 'Custom Network' : 'Integrated Network',
    });
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
      setIsGnosisAccount(true);
    }
    if (currentAccount.type === KEYRING_TYPE.CoboArgusKeyring) {
      setIsCoboArugsAccount(true);
    }
    checkCanProcess();
    const balance = await wallet.getCustomTestnetToken({
      chainId,
      address: currentAccount.address,
    });

    setNativeTokenBalance(balance.rawAmount);
    let customGasPrice = 0;
    const lastTimeGas = await runGetLastTimeGasSelection();
    if (lastTimeGas?.lastTimeSelect === 'gasPrice' && lastTimeGas.gasPrice) {
      // use cached gasPrice if exist
      customGasPrice = lastTimeGas.gasPrice;
    }
    if (isSpeedUp || isCancel || ((isSend || isSwap) && tx.gasPrice)) {
      // use gasPrice set by dapp when it's a speedup or cancel tx
      customGasPrice = parseInt(tx.gasPrice!);
    }
    await runGetGasUsed();
    const recommendNonce = await runGetNonce();
    if (updateNonce) {
      setRealNonce(intToHex(recommendNonce));
    }
    const gasList = await runGetGasMarket(customGasPrice);
    // const median = gasList.find((item) => item.level === 'normal');
    let gas: GasLevel | null = null;

    if (
      ((isSend || isSwap) && customGasPrice) ||
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
    setIsReady(true);
  };

  useMount(() => {
    init();
  });

  const { t } = useTranslation();

  const [getApproval, resolveApproval, rejectApproval] = useApproval();

  const checkCanProcess = async () => {
    const session = params.session;
    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;
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

    const currentAccount = (await wallet.getCurrentAccount())!;

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
      }));

    if (currentAccount?.type && WaitingSignComponent[currentAccount.type]) {
      resolveApproval({
        ...transaction,
        isSend,
        nonce: realNonce || tx.nonce,
        gas: gasLimit,
        uiRequestComponent: WaitingSignComponent[currentAccount.type],
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
        />

        {isReady && (
          <Card>
            <MessageWrapper>
              <div className="title">
                <div className="title-text">
                  {t('page.customTestnet.signTx.title')}
                </div>
              </div>
              <div className="content">
                {JSON.stringify(
                  {
                    ...tx,
                    nonce: realNonce || tx.nonce,
                    gas: gasLimit!,
                  },
                  null,
                  2
                )}
              </div>
            </MessageWrapper>
          </Card>
        )}

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
              'ml-auto mr-[-20px] mt-[-116px]',
              'px-[16px] py-[12px] rotate-[-23deg]',
              'border-rabby-neutral-title1 border-[1px] rounded-[6px]',
              'text-r-neutral-title1 text-[20px] leading-[24px]',
              'opacity-30'
            )}
          >
            Custom Network
          </div>
        )}
      </div>
      <FooterBar
        Header={
          <GasSelectorHeader
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
          (isLedger && !hasConnectedLedgerHID) ||
          !canProcess ||
          !!checkErrors.find((item) => item.level === 'forbidden')
        }
      />
    </>
  );
};
