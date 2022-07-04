import stats from '@/stats';
import { hasConnectedLedgerDevice } from '@/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import {
  convertLegacyTo1559,
  getKRCategoryByType,
  validateGasPriceRange,
} from '@/utils/transaction';
import Safe from '@rabby-wallet/gnosis-sdk';
import { SafeInfo } from '@rabby-wallet/gnosis-sdk/src/api';
import * as Sentry from '@sentry/browser';
import { Button, Drawer, Modal, Tooltip } from 'antd';
import {
  Chain,
  ExplainTxResponse,
  GasLevel,
  SecurityCheckDecision,
  SecurityCheckResponse,
  Tx,
} from 'background/service/openapi';
import { Account, ChainGas } from 'background/service/preference';
import BigNumber from 'bignumber.js';
import clsx from 'clsx';
import {
  CHAINS,
  CHAINS_ENUM,
  HARDWARE_KEYRING_TYPES,
  INTERNAL_REQUEST_ORIGIN,
  KEYRING_CLASS,
  KEYRING_TYPE,
  SUPPORT_1559_KEYRING_TYPE,
  KEYRING_CATEGORY_MAP,
} from 'consts';
import {
  addHexPrefix,
  intToHex,
  isHexPrefixed,
  isHexString,
  unpadHexString,
} from 'ethereumjs-util';
import React, { ReactNode, useEffect, useState } from 'react';
import ReactGA from 'react-ga';
import { useTranslation } from 'react-i18next';
import IconInfo from 'ui/assets/infoicon.svg';
import IconGnosis from 'ui/assets/walletlogo/gnosis.png';
import IconWatch from 'ui/assets/walletlogo/watch-purple.svg';
import { Checkbox } from 'ui/component';
import { useApproval, useWallet, isStringOrNumber } from 'ui/utils';
import AccountCard from './AccountCard';
import LedgerWebHIDAlert from './LedgerWebHIDAlert';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';
import { WaitingSignComponent } from './SignText';
import Approve from './TxComponents/Approve';
import ApproveNFT from './TxComponents/ApproveNFT';
import ApproveNFTCollection from './TxComponents/ApproveNFTCollection';
import Cancel from './TxComponents/Cancel';
import CancelNFT from './TxComponents/CancelNFT';
import CancelNFTCollection from './TxComponents/CancelNFTCollection';
import CancelTx from './TxComponents/CancelTx';
import Deploy from './TxComponents/Deploy';
import GasSelector, { GasSelectorResponse } from './TxComponents/GasSelecter';
import GnosisDrawer from './TxComponents/GnosisDrawer';
import Loading from './TxComponents/Loading';
import Send from './TxComponents/Send';
import SendNFT from './TxComponents/sendNFT';
import Sign from './TxComponents/Sign';

const normalizeHex = (value: string | number) => {
  if (typeof value === 'number') {
    return intToHex(Math.floor(value));
  }
  if (typeof value === 'string') {
    if (!isHexPrefixed(value)) {
      return addHexPrefix(value);
    }
    return value;
  }
  return value;
};

const normalizeTxParams = (tx) => {
  const copy = tx;
  try {
    if ('nonce' in copy && isStringOrNumber(copy.nonce)) {
      copy.nonce = normalizeHex(copy.nonce);
    }
    if ('gas' in copy && isStringOrNumber(copy.gas)) {
      copy.gas = normalizeHex(copy.gas);
    }
    if ('gasLimit' in copy && isStringOrNumber(copy.gasLimit)) {
      copy.gas = normalizeHex(copy.gasLimit);
    }
    if ('gasPrice' in copy && isStringOrNumber(copy.gasPrice)) {
      copy.gasPrice = normalizeHex(copy.gasPrice);
    }
    if ('value' in copy) {
      copy.value = addHexPrefix(
        unpadHexString(addHexPrefix(copy.value) || '0x0')
      );
    }
  } catch (e) {
    Sentry.captureException(
      new Error(`normalizeTxParams failed, ${JSON.stringify(e)}`)
    );
  }
  return copy;
};

export const TxTypeComponent = ({
  txDetail,
  chain = CHAINS[CHAINS_ENUM.ETH],
  isReady,
  raw,
  onChange,
  tx,
  isSpeedUp,
}: {
  txDetail: ExplainTxResponse;
  chain: Chain | undefined;
  isReady: boolean;
  raw: Record<string, string | number>;
  onChange(data: Record<string, any>): void;
  tx: Tx;
  isSpeedUp: boolean;
}) => {
  if (!isReady) return <Loading chainEnum={chain.enum} />;

  if (txDetail.type_deploy_contract)
    return (
      <Deploy
        data={txDetail}
        chainEnum={chain.enum}
        isSpeedUp={isSpeedUp}
        raw={raw}
      />
    );
  if (txDetail.type_cancel_tx)
    return (
      <CancelTx
        data={txDetail}
        chainEnum={chain.enum}
        tx={tx}
        isSpeedUp={isSpeedUp}
        raw={raw}
      />
    );
  if (txDetail.type_cancel_single_nft_approval)
    return (
      <CancelNFT
        data={txDetail}
        chainEnum={chain.enum}
        isSpeedUp={isSpeedUp}
        raw={raw}
      />
    );
  if (txDetail.type_cancel_nft_collection_approval)
    return (
      <CancelNFTCollection
        data={txDetail}
        chainEnum={chain.enum}
        isSpeedUp={isSpeedUp}
        raw={raw}
      />
    );
  if (txDetail.type_cancel_token_approval)
    return (
      <Cancel
        data={txDetail}
        chainEnum={chain.enum}
        isSpeedUp={isSpeedUp}
        raw={raw}
      />
    );
  if (txDetail.type_single_nft_approval)
    return (
      <ApproveNFT
        data={txDetail}
        chainEnum={chain.enum}
        isSpeedUp={isSpeedUp}
        raw={raw}
      />
    );
  if (txDetail.type_nft_collection_approval)
    return (
      <ApproveNFTCollection
        data={txDetail}
        chainEnum={chain.enum}
        isSpeedUp={isSpeedUp}
        raw={raw}
      />
    );
  if (txDetail.type_nft_send)
    return (
      <SendNFT
        data={txDetail}
        chainEnum={chain.enum}
        isSpeedUp={isSpeedUp}
        raw={raw}
      />
    );
  if (txDetail.type_token_approval)
    return (
      <Approve
        data={txDetail}
        chainEnum={chain.enum}
        onChange={onChange}
        tx={tx}
        isSpeedUp={isSpeedUp}
        raw={raw}
      />
    );
  if (txDetail.type_send)
    return (
      <Send
        data={txDetail}
        chainEnum={chain.enum}
        isSpeedUp={isSpeedUp}
        raw={raw}
      />
    );
  if (txDetail.type_call)
    return (
      <Sign
        data={txDetail}
        raw={raw}
        chainEnum={chain.enum}
        isSpeedUp={isSpeedUp}
        tx={tx}
      />
    );
  return <></>;
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

const SignTx = ({ params, origin }: SignTxProps) => {
  const { isGnosis, account } = params;
  const [isReady, setIsReady] = useState(false);
  const [nonceChanged, setNonceChanged] = useState(false);
  const [canProcess, setCanProcess] = useState(true);
  const [
    cantProcessReason,
    setCantProcessReason,
  ] = useState<ReactNode | null>();
  const [txDetail, setTxDetail] = useState<ExplainTxResponse | null>({
    balance_change: {
      err_msg: '',
      receive_nft_list: [],
      receive_token_list: [],
      send_nft_list: [],
      send_token_list: [],
      success: true,
      usd_value_change: 0,
    },
    native_token: {
      amount: 0,
      chain: '',
      decimals: 18,
      display_symbol: '',
      id: '1',
      is_core: true,
      is_verified: true,
      is_wallet: true,
      is_infinity: true,
      logo_url: '',
      name: '',
      optimized_symbol: '',
      price: 0,
      symbol: '',
      time_at: 0,
      usd_value: 0,
    },
    gas: {
      estimated_gas_cost_usd_value: 0,
      estimated_gas_cost_value: 0,
      estimated_gas_used: 0,
      estimated_seconds: 0,
    },
    pre_exec: {
      success: true,
      err_msg: '',
    },
    recommend: {
      gas: '',
      nonce: '',
    },
    support_balance_change: true,
    type_call: {
      action: '',
      contract: '',
      contract_protocol_logo_url: '',
      contract_protocol_name: '',
    },
  });
  const [submitText, setSubmitText] = useState('Proceed');
  const [checkText, setCheckText] = useState('Sign');
  const { t } = useTranslation();
  const [
    securityCheckStatus,
    setSecurityCheckStatus,
  ] = useState<SecurityCheckDecision>('loading');
  const [securityCheckAlert, setSecurityCheckAlert] = useState('Checking...');
  const [showSecurityCheckDetail, setShowSecurityCheckDetail] = useState(false);
  const [
    securityCheckDetail,
    setSecurityCheckDetail,
  ] = useState<SecurityCheckResponse | null>(null);
  const [preprocessSuccess, setPreprocessSuccess] = useState(true);
  const [chainId, setChainId] = useState<number>(
    params.data[0].chainId && Number(params.data[0].chainId)
  );
  const [chain, setChain] = useState(
    Object.values(CHAINS).find((item) => item.id === chainId)
  );
  const [inited, setInited] = useState(false);
  const [isHardware, setIsHardware] = useState(false);
  const [selectedGas, setSelectedGas] = useState<GasLevel | null>(null);
  const [gasList, setGasList] = useState<GasLevel[]>([
    {
      level: 'slow',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
    {
      level: 'normal',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
    {
      level: 'fast',
      front_tx_count: 0,
      price: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
    {
      level: 'custom',
      price: 0,
      front_tx_count: 0,
      estimated_seconds: 0,
      base_fee: 0,
    },
  ]);
  const [isGnosisAccount, setIsGnosisAccount] = useState(false);
  const [gnosisDrawerVisible, setGnosisDrawerVisble] = useState(false);
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWallet();
  if (!chain) throw new Error('No support chain not found');
  const [support1559, setSupport1559] = useState(chain.eip['1559']);
  const [isLedger, setIsLedger] = useState(false);
  const [useLedgerLive, setUseLedgerLive] = useState(false);
  const [hasConnectedLedgerHID, setHasConnectedLedgerHID] = useState(false);

  const gaEvent = async (type: 'allow' | 'cancel') => {
    const ga:
      | {
          category: 'Send' | 'Security';
          source: 'sendNFT' | 'sendToken' | 'nftApproval' | 'tokenApproval';
          trigger: string;
        }
      | undefined = params?.$ctx?.ga;
    if (!ga) {
      return;
    }
    const { category, source, trigger } = ga;
    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;

    if (category === 'Send') {
      ReactGA.event({
        category,
        action: type === 'cancel' ? 'cancelSignTx' : 'signTx',
        label: [
          chain.name,
          getKRCategoryByType(currentAccount.type),
          currentAccount.brandName,
          source === 'sendNFT' ? 'nft' : 'token',
          trigger,
        ].join('|'),
        transport: 'beacon',
      });
    } else if (category === 'Security') {
      let action = '';
      if (type === 'cancel') {
        if (source === 'nftApproval') {
          action = 'cancelSignDeclineNFTApproval';
        } else {
          action = 'cancelSignDeclineTokenApproval';
        }
      } else {
        if (source === 'nftApproval') {
          action = 'signDeclineNFTApproval';
        } else {
          action = 'signDeclineTokenApproval';
        }
      }
      ReactGA.event({
        category,
        action,
        label: [
          chain.name,
          getKRCategoryByType(currentAccount.type),
          currentAccount.brandName,
        ].join('|'),
        transport: 'beacon',
      });
    }
  };

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
  } = normalizeTxParams(params.data[0]);
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
  const [realNonce, setRealNonce] = useState('');
  const [gasLimit, setGasLimit] = useState<string | undefined>(undefined);
  const [forceProcess, setForceProcess] = useState(false);
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const [maxPriorityFee, setMaxPriorityFee] = useState(0);

  const checkTx = async (address: string) => {
    try {
      setSecurityCheckStatus('loading');
      const res = await wallet.openapi.checkTx(
        {
          ...tx,
          nonce: tx.nonce || '0x1',
          data: tx.data,
          value: tx.value || '0x0',
          gas: tx.gas || '',
        }, // set a mock nonce for check if dapp not set it
        origin || '',
        address,
        !(nonce && tx.from === tx.to)
      );
      setSecurityCheckStatus(res.decision);
      setSecurityCheckAlert(res.alert);
      setSecurityCheckDetail(res);
    } catch (e: any) {
      const alert = e.message || JSON.stringify(e);
      setSecurityCheckStatus('danger');
      setSecurityCheckAlert(alert);
      setSecurityCheckDetail({
        alert,
        decision: 'danger',
        danger_list: [{ id: 1, alert }],
        warning_list: [],
        forbidden_list: [],
        trace_id: '',
      });
    }
  };

  const explainTx = async (address: string) => {
    const res: ExplainTxResponse = await wallet.openapi.explainTx(
      {
        ...tx,
        nonce: tx.nonce || '0x1', // set a mock nonce for explain if dapp not set it
        data: tx.data,
        value: tx.value || '0x0',
        gas: tx.gas || '', // set gas limit if dapp not set
      },
      origin || '',
      address,
      updateNonce
    );
    if (!gasLimit) {
      // use server response gas limit
      const recommendGasLimit = new BigNumber(res.recommend.gas).toFixed(0);
      setGasLimit(intToHex(Number(recommendGasLimit)));
    }
    setTxDetail(res);
    const localNonce = (await wallet.getNonceByChain(tx.from, chainId)) || 0;
    if (updateNonce && !isGnosisAccount) {
      setRealNonce(intToHex(Math.max(Number(res.recommend.nonce), localNonce)));
    } // do not overwrite nonce if from === to(cancel transaction)
    setPreprocessSuccess(res.pre_exec.success);
    wallet.addTxExplainCache({
      address,
      chainId,
      nonce: updateNonce
        ? Math.max(Number(res.recommend.nonce), localNonce)
        : Number(tx.nonce),
      explain: res,
    });
    return res;
  };

  const explain = async () => {
    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;
    try {
      setIsReady(false);
      const res = await explainTx(currentAccount.address);
      if (res.pre_exec.success) {
        await checkTx(currentAccount.address);
      }
      setIsReady(true);
    } catch (e: any) {
      Modal.error({
        title: t('Error'),
        content: e.message || JSON.stringify(e),
      });
    }
  };

  const handleGnosisConfirm = async (account: Account) => {
    stats.report('signTransaction', {
      type: KEYRING_TYPE.GnosisKeyring,
      category: KEYRING_CATEGORY_MAP[KEYRING_CLASS.GNOSIS],
      chainId: chain.serverId,
    });
    if (params.session.origin !== INTERNAL_REQUEST_ORIGIN || isSend) {
      const params: any = {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
      };
      if (nonceChanged) {
        params.nonce = realNonce;
      }
      await wallet.buildGnosisTransaction(tx.from, account, params);
    }
    const hash = await wallet.getGnosisTransactionHash();
    resolveApproval({
      data: [hash, account.address],
      session: params.session,
      isGnosis: true,
      account: account,
      uiRequestComponent: 'SignText',
    });
  };

  const handleAllow = async (doubleCheck = false) => {
    if (!selectedGas) return;
    if (!doubleCheck && securityCheckStatus !== 'pass') {
      setShowSecurityCheckDetail(true);
      return;
    }

    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;

    try {
      validateGasPriceRange(tx);
    } catch (e) {
      Modal.error({
        title: t('Error'),
        content: e.message || JSON.stringify(e),
      });
      return;
    }

    const selected: ChainGas = {
      lastTimeSelect: selectedGas.level === 'custom' ? 'gasPrice' : 'gasLevel',
    };
    if (selectedGas.level === 'custom') {
      if (support1559) {
        selected.gasPrice = parseInt(tx.maxFeePerGas!);
      } else {
        selected.gasPrice = parseInt(tx.gasPrice!);
      }
    } else {
      selected.gasLevel = selectedGas.level;
    }
    await wallet.updateLastTimeGasSelection(chainId, selected);
    const transaction: Tx = {
      from: tx.from,
      to: tx.to,
      data: tx.data,
      nonce: tx.nonce,
      value: tx.value,
      chainId: tx.chainId,
      gas: '',
    };
    if (support1559) {
      transaction.maxFeePerGas = tx.maxFeePerGas;
      transaction.maxPriorityFeePerGas = intToHex(maxPriorityFee);
    } else {
      (transaction as Tx).gasPrice = tx.gasPrice;
    }
    if (currentAccount?.type && WaitingSignComponent[currentAccount.type]) {
      resolveApproval({
        ...transaction,
        isSend,
        nonce: realNonce || tx.nonce,
        gas: gasLimit,
        uiRequestComponent: WaitingSignComponent[currentAccount.type],
        type: currentAccount.type,
        address: currentAccount.address,
        traceId: securityCheckDetail?.trace_id,
        extra: {
          brandName: currentAccount.brandName,
        },
      });

      return;
    }
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
      setGnosisDrawerVisble(true);
      return;
    }

    await wallet.reportStats('signTransaction', {
      type: currentAccount.brandName,
      chainId: chain.serverId,
      category: KEYRING_CATEGORY_MAP[currentAccount.type],
    });

    gaEvent('allow');

    ReactGA.event({
      category: 'Transaction',
      action: 'Submit',
      label: currentAccount.brandName,
    });
    resolveApproval({
      ...transaction,
      nonce: realNonce || tx.nonce,
      gas: gasLimit,
      isSend,
      traceId: securityCheckDetail?.trace_id,
    });
  };

  const handleGasChange = (gas: GasSelectorResponse) => {
    setSelectedGas({
      level: gas.level,
      front_tx_count: gas.front_tx_count,
      estimated_seconds: gas.estimated_seconds,
      base_fee: gas.base_fee,
      price: gas.price,
    });
    if (gas.level === 'custom') {
      setGasList(
        gasList.map((item) => {
          if (item.level === 'custom') return gas;
          return item;
        })
      );
    }
    const beforeNonce = realNonce || tx.nonce;
    const afterNonce = intToHex(gas.nonce);
    if (support1559) {
      setTx({
        ...tx,
        maxFeePerGas: intToHex(Math.round(gas.price)),
        gas: intToHex(gas.gasLimit),
        nonce: afterNonce,
      });
    } else {
      setTx({
        ...tx,
        gasPrice: intToHex(Math.round(gas.price)),
        gas: intToHex(gas.gasLimit),
        nonce: afterNonce,
      });
    }
    setGasLimit(intToHex(gas.gasLimit));
    if (!isGnosisAccount) {
      setRealNonce(afterNonce);
    } else {
      if (safeInfo && safeInfo.nonce <= gas.nonce) {
        setRealNonce(afterNonce);
      } else {
        safeInfo && setRealNonce(`0x${safeInfo.nonce.toString(16)}`);
      }
    }
    if (beforeNonce !== afterNonce) {
      setNonceChanged(true);
    }
  };

  const handleMaxPriorityFeeChange = (fee: number) => {
    setMaxPriorityFee(fee);
  };

  const handleCancel = () => {
    gaEvent('cancel');
    rejectApproval('User rejected the request.');
  };

  const handleGnosisDrawerCancel = () => {
    setGnosisDrawerVisble(false);
  };

  const handleForceProcessChange = (checked: boolean) => {
    setForceProcess(checked);
  };

  const handleTxChange = (obj: Record<string, any>) => {
    setTx({
      ...tx,
      ...obj,
    });
  };

  const loadGasMarket = async (
    chain: Chain,
    custom?: number
  ): Promise<GasLevel[]> => {
    const list = await wallet.openapi.gasMarket(
      chain.serverId,
      custom && custom > 0 ? custom : undefined
    );
    setGasList(list);
    return list;
  };

  const checkCanProcess = async () => {
    const session = params.session;
    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;
    const site = await wallet.getConnectedSite(session.origin);

    if (currentAccount.type === KEYRING_TYPE.WatchAddressKeyring) {
      setCanProcess(false);
      setCantProcessReason(
        <div className="flex items-center gap-8">
          <img src={IconWatch} alt="" className="w-[24px]" />
          <div>
            The current address is in Watch Mode. If your want to continue,
            please{' '}
            <a
              href=""
              className="underline"
              onClick={async (e) => {
                e.preventDefault();
                await rejectApproval('User rejected the request.', true);
                openInternalPageInTab('no-address');
              }}
            >
              import it
            </a>{' '}
            again using another mode.
          </div>
        </div>
      );
    }
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring || isGnosis) {
      const networkId = await wallet.getGnosisNetworkId(currentAccount.address);

      if ((chainId || CHAINS[site!.chain].id) !== Number(networkId)) {
        setCanProcess(false);
        setCantProcessReason(
          <div className="flex items-center gap-8">
            <img src={IconGnosis} alt="" className="w-[24px]" />
            {t('multiSignChainNotMatch')}
          </div>
        );
      }
    }
  };

  const getSafeInfo = async () => {
    const currentAccount = (await wallet.getCurrentAccount())!;
    const networkId = await wallet.getGnosisNetworkId(currentAccount.address);
    const safeInfo = await Safe.getSafeInfo(currentAccount.address, networkId);
    setSafeInfo(safeInfo);
    if (Number(tx.nonce || 0) < safeInfo.nonce) {
      setTx({
        ...tx,
        nonce: `0x${safeInfo.nonce.toString(16)}`,
      });
    }
    if (Number(realNonce || 0) < safeInfo.nonce) {
      setRealNonce(`0x${safeInfo.nonce.toString(16)}`);
    }
  };

  const init = async () => {
    const currentAccount =
      isGnosis && account ? account : (await wallet.getCurrentAccount())!;
    const is1559 =
      support1559 && SUPPORT_1559_KEYRING_TYPE.includes(currentAccount.type);
    setIsLedger(currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER);
    setUseLedgerLive(await wallet.isUseLedgerLive());
    setHasConnectedLedgerHID(await hasConnectedLedgerDevice());
    setIsHardware(
      !!Object.values(HARDWARE_KEYRING_TYPES).find(
        (item) => item.type === currentAccount.type
      )
    );

    stats.report('createTransaction', {
      type: currentAccount.brandName,
      category: KEYRING_CATEGORY_MAP[currentAccount.type],
      chainId: chain.serverId,
    });

    ReactGA.event({
      category: 'Transaction',
      action: 'init',
      label: currentAccount.brandName,
    });

    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
      setIsGnosisAccount(true);
      await getSafeInfo();
    }
    checkCanProcess();
    const lastTimeGas: ChainGas | null = await wallet.getLastTimeGasSelection(
      chainId
    );
    let customGasPrice = 0;
    if (lastTimeGas?.lastTimeSelect === 'gasPrice' && lastTimeGas.gasPrice) {
      // use cached gasPrice if exist
      customGasPrice = lastTimeGas.gasPrice;
    }
    if (isSpeedUp || isCancel || (isSend && tx.gasPrice)) {
      // use gasPrice set by dapp when it's a speedup or cancel tx
      customGasPrice = parseInt(tx.gasPrice!);
    }
    const gasList = await loadGasMarket(chain, customGasPrice);
    let gas: GasLevel | null = null;

    if (
      (isSend && customGasPrice) ||
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
      gas = target;
    } else {
      // no cache, use the fast level in gasMarket
      gas = gasList.find((item) => item.level === 'fast')!;
    }

    setSelectedGas(gas);
    setSupport1559(is1559);
    if (is1559) {
      setTx(
        convertLegacyTo1559({
          ...tx,
          gasPrice: intToHex(gas.price),
        })
      );
    } else {
      setTx({
        ...tx,
        gasPrice: intToHex(gas.price),
      });
    }
    setInited(true);
  };

  const handleIsGnosisAccountChange = async () => {
    if (params.session.origin !== INTERNAL_REQUEST_ORIGIN) {
      await wallet.clearGnosisTransaction();
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (isGnosisAccount) {
      handleIsGnosisAccountChange();
    }
  }, [isGnosisAccount]);

  useEffect(() => {
    if (!inited) return;
    explain();
  }, [tx, inited]);

  useEffect(() => {
    (async () => {
      const currentAccount = (await wallet.getCurrentAccount())!;
      if (
        [
          KEYRING_CLASS.MNEMONIC,
          KEYRING_CLASS.PRIVATE_KEY,
          KEYRING_CLASS.WATCH,
        ].includes(currentAccount.type)
      ) {
        setSubmitText('Sign');
        setCheckText('Sign');
      } else {
        setSubmitText('Proceed');
        setCheckText('Proceed');
      }
      if (['danger', 'forbidden'].includes(securityCheckStatus)) {
        setSubmitText('Continue');
      }
    })();
  }, [securityCheckStatus]);

  const approvalTxStyle: Record<string, string> = {};
  if (isLedger && !useLedgerLive && !hasConnectedLedgerHID) {
    approvalTxStyle.paddingBottom = '230px';
  }
  return (
    <>
      <AccountCard />
      <div
        className={clsx('approval-tx', {
          'pre-process-failed': !preprocessSuccess,
        })}
        style={approvalTxStyle}
      >
        {txDetail && (
          <>
            {txDetail && (
              <TxTypeComponent
                isReady={isReady}
                txDetail={txDetail}
                chain={chain}
                raw={{
                  ...tx,
                  nonce: realNonce || tx.nonce,
                  gas: gasLimit!,
                }}
                onChange={handleTxChange}
                tx={{
                  ...tx,
                  nonce: realNonce || tx.nonce,
                  gas: gasLimit,
                }}
                isSpeedUp={isSpeedUp}
              />
            )}
            <GasSelector
              isReady={isReady}
              tx={tx}
              gasLimit={gasLimit}
              noUpdate={isCancel || isSpeedUp}
              gasList={gasList}
              selectedGas={selectedGas}
              gas={{
                ...(txDetail
                  ? txDetail.gas
                  : {
                      estimated_gas_cost_usd_value: 0,
                      estimated_gas_cost_value: 0,
                      estimated_seconds: 0,
                      estimated_gas_used: 0,
                    }),
                front_tx_count: 0,
                max_gas_cost_usd_value: 0,
                max_gas_cost_value: 0,
              }}
              recommendGasLimit={Number(txDetail.recommend.gas)}
              chainId={chainId}
              onChange={handleGasChange}
              onMaxPriorityFeeChange={handleMaxPriorityFeeChange}
              nonce={realNonce || tx.nonce}
              disableNonce={isSpeedUp || isCancel}
              is1559={support1559}
              isHardware={isHardware}
            />
            <footer className="connect-footer">
              {txDetail && txDetail.pre_exec.success && (
                <>
                  {isLedger && !useLedgerLive && !hasConnectedLedgerHID && (
                    <LedgerWebHIDAlert connected={hasConnectedLedgerHID} />
                  )}
                  <SecurityCheckBar
                    status={securityCheckStatus}
                    alert={securityCheckAlert}
                    onClick={() => setShowSecurityCheckDetail(true)}
                  />
                  <div className="action-buttons flex justify-between relative">
                    <Button
                      type="primary"
                      size="large"
                      className="w-[172px]"
                      onClick={handleCancel}
                    >
                      {t('Cancel')}
                    </Button>
                    {!canProcess ? (
                      <Tooltip
                        overlayClassName={clsx(
                          'rectangle watcSign__tooltip',
                          `watcSign__tooltip-${submitText}`
                        )}
                        title={cantProcessReason}
                        placement="topRight"
                      >
                        <div className="w-[172px] relative flex items-center">
                          <Button
                            type="primary"
                            size="large"
                            className="w-[172px]"
                            onClick={() => handleAllow()}
                            disabled={true}
                          >
                            {t(submitText)}
                          </Button>
                          <img
                            src={IconInfo}
                            className={clsx(
                              'absolute right-[40px]',
                              `icon-submit-${submitText}`
                            )}
                          />
                        </div>
                      </Tooltip>
                    ) : (
                      <Button
                        type="primary"
                        size="large"
                        className="w-[172px]"
                        onClick={() => handleAllow()}
                        disabled={
                          !isReady ||
                          (selectedGas ? selectedGas.price < 0 : true) ||
                          (isGnosisAccount ? !safeInfo : false) ||
                          (isLedger && !useLedgerLive && !hasConnectedLedgerHID)
                        }
                        loading={isGnosisAccount ? !safeInfo : false}
                      >
                        {t(submitText)}
                      </Button>
                    )}
                  </div>
                </>
              )}
              {txDetail && !txDetail.pre_exec.success && (
                <>
                  {isLedger && !useLedgerLive && !hasConnectedLedgerHID && (
                    <LedgerWebHIDAlert connected={hasConnectedLedgerHID} />
                  )}
                  {!(isLedger && !useLedgerLive && !hasConnectedLedgerHID) && (
                    <>
                      <p className="text-gray-subTitle mb-8 text-15 font-medium">
                        {t('Preexecution failed')}
                      </p>
                      <p className="text-gray-content text-14 mb-20">
                        {txDetail.pre_exec.err_msg}
                      </p>
                      <div className="force-process">
                        <Checkbox
                          checked={forceProcess}
                          onChange={(e) => handleForceProcessChange(e)}
                        >
                          {t('processAnyway')}
                        </Checkbox>
                      </div>
                    </>
                  )}
                  <div className="action-buttons flex justify-between">
                    <Button
                      type="primary"
                      size="large"
                      className="w-[172px]"
                      onClick={handleCancel}
                    >
                      {t('Cancel')}
                    </Button>
                    {!canProcess ? (
                      <Tooltip
                        overlayClassName={clsx(
                          'rectangle watcSign__tooltip',
                          `watcSign__tooltip-${submitText}`
                        )}
                        title={cantProcessReason}
                        placement="topRight"
                      >
                        <div className="w-[172px] relative flex items-center">
                          <Button
                            type="primary"
                            size="large"
                            className="w-[172px]"
                            onClick={() => handleAllow()}
                            disabled={true}
                          >
                            {t(submitText)}
                          </Button>
                          <img
                            src={IconInfo}
                            className={clsx(
                              'absolute right-[40px]',
                              `icon-submit-${submitText}`
                            )}
                          />
                        </div>
                      </Tooltip>
                    ) : (
                      <Button
                        type="primary"
                        size="large"
                        className="w-[172px]"
                        disabled={
                          !forceProcess ||
                          (selectedGas ? selectedGas.price < 0 : true) ||
                          (isGnosisAccount ? !safeInfo : false) ||
                          (isLedger && !useLedgerLive && !hasConnectedLedgerHID)
                        }
                        loading={isGnosisAccount ? !safeInfo : false}
                        onClick={() => handleAllow(true)}
                      >
                        {t(submitText)}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </footer>
          </>
        )}
        {isGnosisAccount && safeInfo && (
          <Drawer
            placement="bottom"
            height="400px"
            className="gnosis-drawer"
            visible={gnosisDrawerVisible}
            onClose={() => setGnosisDrawerVisble(false)}
            maskClosable
          >
            <GnosisDrawer
              safeInfo={safeInfo}
              onCancel={handleGnosisDrawerCancel}
              onConfirm={handleGnosisConfirm}
            />
          </Drawer>
        )}
        {securityCheckDetail && (
          <SecurityCheckDetail
            visible={showSecurityCheckDetail}
            onCancel={() => setShowSecurityCheckDetail(false)}
            data={securityCheckDetail}
            onOk={() => handleAllow(true)}
            okText={t(checkText)}
            cancelText={t('Cancel')}
            preprocessSuccess={preprocessSuccess}
          />
        )}
      </div>
    </>
  );
};

export default SignTx;
