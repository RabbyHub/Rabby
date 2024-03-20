import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { Account, ChainGas } from 'background/service/preference';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import IconSpeedUp from 'ui/assets/sign/tx/speedup.svg';
import IconQuestionMark from 'ui/assets/sign/question-mark-24.svg';
import IconRabbyDecoded from 'ui/assets/sign/rabby-decoded.svg';
import { findChain } from '@/utils/chain';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { ReactComponent as RcIconArrowRight } from 'ui/assets/approval/edit-arrow-right.svg';
import { Popup } from '@/ui/component';
import { Tabs } from 'antd';
import { TestnetActions } from './components/TestnetActions';
import GasSelector, { GasSelectorResponse } from '../TxComponents/GasSelecter';
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
  HARDWARE_KEYRING_TYPES,
  KEYRING_CATEGORY_MAP,
  KEYRING_CLASS,
  KEYRING_TYPE,
} from '@/constant';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { GasLevel, Tx } from '@rabby-wallet/rabby-api/dist/types';
import { normalizeTxParams } from '../SignTx';
import { isHexString } from 'ethereumjs-util';
import { WaitingSignComponent } from '../map';
import { useLedgerDeviceConnected } from '@/utils/ledger';

const { TabPane } = Tabs;

export const SignTitle = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  .left {
    display: flex;
    font-size: 18px;
    line-height: 21px;
    color: var(--r-neutral-title-1, #f7fafc);
    .icon-speedup {
      width: 10px;
      margin-right: 6px;
      cursor: pointer;
    }
  }
  .right {
    font-size: 14px;
    line-height: 16px;
    color: #999999;
    cursor: pointer;
  }
`;

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
  console.log({
    params,
  });

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
  const chainId = params?.data?.[0]?.chainId;
  const chain = chainId ? findChain({ id: +chainId }) : undefined;

  const [realNonce, setRealNonce] = useState('');
  const [gasLimit, setGasLimit] = useState<string | undefined>(undefined);
  const [selectedGas, setSelectedGas] = useState<GasLevel | null>(null);
  const [nonceChanged, setNonceChanged] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLedger, setIsLedger] = useState(false);
  const hasConnectedLedgerHID = useLedgerDeviceConnected();
  const [isHardware, setIsHardware] = useState(false);
  const [nativeTokenBalance, setNativeTokenBalance] = useState('0x0');
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
    to,
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
        return `0x${new BigNumber(res).toString(16)}`;
      } catch (e) {
        console.log(e);
        return intToHex(21000);
      }
    },
    {
      onSuccess(data) {
        if (!gasLimit) {
          setGasLimit(data);
        }
      },
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

  const handleCancel = () => {
    //  gaEvent('cancel');
    rejectApproval('User rejected the request.');
  };

  const { activeApprovalPopup } = useCommonPopupView();
  const invokeEnterPassphrase = useEnterPassphraseModal('address');

  const handleAllow = async () => {
    if (!selectedGas) {
      console.log('no gas');
      return;
    }

    if (activeApprovalPopup()) {
      console.log('??');
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

    console.log({
      ...transaction,
      nonce: realNonce || tx.nonce,
      gas: gasLimit,
      isSend,
      signingTxId: approval.signingTxId,
      reqId,
    });

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

    // await wallet.reportStats('signTransaction', {
    //   type: currentAccount.brandName,
    //   chainId: chain.serverId,
    //   category: KEYRING_CATEGORY_MAP[currentAccount.type],
    //   preExecSuccess:
    //     checkErrors.length > 0 || !txDetail?.pre_exec.success ? false : true,
    //   createBy: params?.$ctx?.ga ? 'rabby' : 'dapp',
    //   source: params?.$ctx?.ga?.source || '',
    //   trigger: params?.$ctx?.ga?.trigger || '',
    // });

    // matomoRequestEvent({
    //   category: 'Transaction',
    //   action: 'Submit',
    //   label: currentAccount.brandName,
    // });
    resolveApproval({
      ...transaction,
      nonce: realNonce || tx.nonce,
      gas: gasLimit,
      isSend,
      signingTxId: approval.signingTxId,
      reqId,
    });
  };

  useMount(() => {});

  if (!chain) {
    return null;
  }

  return (
    <>
      <div className="approval-tx">
        <TestnetActions
          isReady={isReady}
          chain={chain}
          raw={{
            ...tx,
            nonce: realNonce || tx.nonce,
            gas: gasLimit!,
          }}
          isSpeedUp={isSpeedUp}
        />
        <GasSelector
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
          errors={[]}
          engineResults={[]}
          nativeTokenBalance={nativeTokenBalance}
          gasPriceMedian={null}
        />
      </div>
      <FooterBar
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
        // enableTooltip={
        //   !canProcess ||
        //   !!checkErrors.find((item) => item.level === 'forbidden')
        // }
        // tooltipContent={
        //   checkErrors.find((item) => item.level === 'forbidden')
        //     ? checkErrors.find((item) => item.level === 'forbidden')!.msg
        //     : cantProcessReason
        // }
        disabledProcess={false}
      />
    </>
  );
};
