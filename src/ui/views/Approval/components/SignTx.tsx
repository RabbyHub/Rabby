import React, { useEffect, useState } from 'react';
import {
  intToHex,
  isHexString,
  isHexPrefixed,
  addHexPrefix,
  unpadHexString,
} from 'ethereumjs-util';
import { Button, Modal, Tooltip, Drawer } from 'antd';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Safe from '@rabby-wallet/gnosis-sdk';
import { SafeInfo } from '@rabby-wallet/gnosis-sdk/src/api';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import {
  KEYRING_CLASS,
  CHAINS,
  CHAINS_ENUM,
  KEYRING_TYPE,
  INTERNAL_REQUEST_ORIGIN,
} from 'consts';
import { Checkbox } from 'ui/component';
import AccountCard from './AccountCard';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';
import {
  ExplainTxResponse,
  SecurityCheckResponse,
  SecurityCheckDecision,
  Tx,
  GasLevel,
} from 'background/service/openapi';
import { useWallet, useApproval } from 'ui/utils';
import { ChainGas, Account } from 'background/service/preference';
import GnosisDrawer from './TxComponents/GnosisDrawer';
import Approve from './TxComponents/Approve';
import Cancel from './TxComponents/Cancel';
import Sign from './TxComponents/Sign';
import CancelTx from './TxComponents/CancelTx';
import Send from './TxComponents/Send';
import Deploy from './TxComponents/Deploy';
import Loading from './TxComponents/Loading';
import GasSelector, { GasSelectorResponse } from './TxComponents/GasSelecter';
import { WaitingSignComponent } from './SignText';
import { Chain } from 'background/service/chain';
import IconInfo from 'ui/assets/infoicon.svg';

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
  if ('nonce' in copy) {
    copy.nonce = normalizeHex(copy.nonce);
  }
  if ('gas' in copy) {
    copy.gas = normalizeHex(copy.gas);
  }
  if ('gasLimit' in copy) {
    copy.gas = normalizeHex(copy.gasLimit);
  }
  if ('gasPrice' in copy) {
    copy.gasPrice = normalizeHex(copy.gasPrice);
  }
  if ('value' in copy) {
    copy.value = addHexPrefix(unpadHexString(copy.value || '0x0'));
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
  if (txDetail.type_cancel_token_approval)
    return (
      <Cancel
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

interface SignTxProps {
  params: {
    session: {
      origin: string;
      icon: string;
      name: string;
    };
    data: any[];
    isGnosis?: boolean;
    account?: Account;
  };
  origin: string;
}

const SignTx = ({ params, origin }: SignTxProps) => {
  const { isGnosis, account } = params;
  const [isReady, setIsReady] = useState(false);
  const [nonceChanged, setNonceChanged] = useState(false);
  const [canProcess, setCanProcess] = useState(true);
  const [cantProcessReason, setCantProcessReason] = useState('');
  const [txDetail, setTxDetail] = useState<ExplainTxResponse | null>({
    balance_change: {
      err_msg: '',
      receive_token_list: [],
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
  const [gasLimit, setGasLimit] = useState(gas || params.data[0].gasLimit);
  const [forceProcess, setForceProcess] = useState(false);
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);

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
        origin,
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
      });
    }
  };

  const explainTx = async (address: string) => {
    const res = await wallet.openapi.explainTx(
      {
        ...tx,
        nonce: tx.nonce || '0x1', // set a mock nonce for explain if dapp not set it
        data: tx.data,
        value: tx.value || '0x0',
        gas: tx.gas || '', // set gas limit if dapp not set
      },
      origin,
      address,
      updateNonce
    );
    if (!gasLimit) {
      // use server response gas limit
      setGasLimit(res.recommend.gas);
    }
    setTxDetail(res);
    const localNonce = (await wallet.getNonceByChain(tx.from, chainId)) || 0;
    if (updateNonce) {
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

  const getDefaultGas = async () => {
    const chain = Object.keys(CHAINS)
      .map((key) => CHAINS[key])
      .find((item) => item.id === chainId);
    const gas = await wallet.openapi.gasMarket(chain?.serverId);
    setTx({
      ...tx,
      gasPrice: intToHex(Math.max(...gas.map((item) => parseInt(item.price)))),
    });
  };

  const explain = async () => {
    const currentAccount =
      isGnosis && account ? account : await wallet.getCurrentAccount();
    try {
      setIsReady(false);
      const res = await explainTx(currentAccount!.address);
      if (res.pre_exec.success) {
        await checkTx(currentAccount!.address);
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
    if (params.session.origin !== INTERNAL_REQUEST_ORIGIN) {
      await wallet.buildGnosisTransaction(tx.from, account, {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });
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
      isGnosis && account ? account : await wallet.getCurrentAccount();
    if (
      currentAccount?.type === KEYRING_CLASS.HARDWARE.LEDGER &&
      !(await wallet.isUseLedgerLive())
    ) {
      try {
        const keyring = await wallet.connectHardware(
          KEYRING_CLASS.HARDWARE.LEDGER
        );
        if (keyring.isWebUSB) {
          const transport = await TransportWebUSB.create();
          await transport.close();
        }
      } catch (e) {
        // NOTHING
      }
    }
    const selected: ChainGas = {
      lastTimeSelect: selectedGas.level === 'custom' ? 'gasPrice' : 'gasLevel',
    };
    if (selectedGas.level === 'custom') {
      selected.gasPrice = parseInt(tx?.gasPrice);
    } else {
      selected.gasLevel = selectedGas.level;
    }
    await wallet.updateLastTimeGasSelection(chainId, selected);
    if (currentAccount?.type && WaitingSignComponent[currentAccount.type]) {
      resolveApproval({
        ...tx,
        isSend,
        nonce: realNonce || tx.nonce,
        gas: gasLimit,
        uiRequestComponent: WaitingSignComponent[currentAccount.type],
        type: currentAccount.type,
        address: currentAccount.address,
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

    resolveApproval({
      ...tx,
      nonce: realNonce || tx.nonce,
      gas: gasLimit,
      isSend,
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
    setTx({
      ...tx,
      gasPrice: intToHex(Math.round(gas.price)),
      gas: intToHex(gas.gasLimit),
      nonce: afterNonce,
    });
    setGasLimit(intToHex(gas.gasLimit));
    setRealNonce(afterNonce);
    if (beforeNonce !== afterNonce) {
      setNonceChanged(true);
    }
  };

  const handleCancel = () => {
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
      isGnosis && account ? account : await wallet.getCurrentAccount();
    const site = await wallet.getConnectedSite(session.origin);

    if (currentAccount.type === KEYRING_TYPE.WatchAddressKeyring) {
      setCanProcess(false);
      setCantProcessReason(t('Use_other_methods'));
    }
    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring || isGnosis) {
      const networkId = await wallet.getGnosisNetworkId(currentAccount.address);

      if ((chainId || CHAINS[site!.chain].id) !== Number(networkId)) {
        setCanProcess(false);
        setCantProcessReason(t('multiSignChainNotMatch'));
      }
    }
  };

  const init = async () => {
    const session = params.session;
    const site = await wallet.getConnectedSite(session.origin);
    const currentAccount =
      isGnosis && account ? account : await wallet.getCurrentAccount();

    if (currentAccount.type === KEYRING_TYPE.GnosisKeyring) {
      setIsGnosisAccount(true);
    }

    if (!chainId) {
      setChainId(CHAINS[site!.chain].id);
    }
    setChain(
      Object.values(CHAINS).find(
        (item) => item.id === (chainId || CHAINS[site!.chain].id)
      )!
    );
    checkCanProcess();
    const lastTimeGas: ChainGas | null = await wallet.getLastTimeGasSelection(
      chainId || CHAINS[site!.chain].id
    );
    const chain = Object.keys(CHAINS)
      .map((key) => CHAINS[key])
      .find((item) => item.id === (chainId || CHAINS[site!.chain].id))!;
    let customGasPrice = 0;
    if (lastTimeGas?.lastTimeSelect === 'gasPrice' && lastTimeGas.gasPrice) {
      // use cached gasPrice if exist
      customGasPrice = lastTimeGas.gasPrice;
    }
    if (isSpeedUp || isCancel) {
      // use gasPrice set by dapp when it's a speedup or cancel tx
      customGasPrice = parseInt(tx.gasPrice);
    }
    const gasList = await loadGasMarket(chain, customGasPrice);
    let gas: GasLevel | null = null;
    if (isSpeedUp || isCancel || lastTimeGas?.lastTimeSelect === 'gasPrice') {
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
    setTx({
      ...tx,
      chainId: chainId || CHAINS[site!.chain].id,
      gasPrice: intToHex(gas.price),
    });
    setInited(true);
  };

  const getSafeInfo = async () => {
    const currentAccount = await wallet.getCurrentAccount();
    const networkId = await wallet.getGnosisNetworkId(currentAccount.address);
    const safeInfo = await Safe.getSafeInfo(currentAccount.address, networkId);
    setSafeInfo(safeInfo);
  };

  const handleIsGnosisAccountChange = async () => {
    if (params.session.origin !== INTERNAL_REQUEST_ORIGIN) {
      await wallet.clearGnosisTransaction();
    }
    await getSafeInfo();
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

    if (!tx.gasPrice && chainId) {
      // use minimum gas as default gas if dapp not set gasPrice
      getDefaultGas();
      return;
    }
    explain();
  }, [tx, inited]);

  useEffect(() => {
    if (isGnosisAccount || securityCheckStatus !== 'pass') {
      setSubmitText('Proceed');
      return;
    }
    setSubmitText('Sign');
  }, [isGnosisAccount, securityCheckStatus]);

  return (
    <>
      <AccountCard />
      <div
        className={clsx('approval-tx', {
          'pre-process-failed': !preprocessSuccess,
        })}
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
                  gas: gasLimit,
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
              nonce={realNonce || tx.nonce}
              disableNonce={isSpeedUp || isCancel}
            />
            <footer className="connect-footer">
              {txDetail && txDetail.pre_exec.success && (
                <>
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
                        overlayClassName="rectangle watcSign__tooltip"
                        title={cantProcessReason}
                      >
                        <div className="w-[172px] relative flex items-center">
                          <Button
                            type="primary"
                            size="large"
                            className="w-[172px]"
                            onClick={() => handleAllow()}
                            disabled={true}
                          >
                            {t('Proceed')}
                          </Button>
                          <img
                            src={IconInfo}
                            className="absolute right-[40px]"
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
                          (selectedGas ? selectedGas.price <= 0 : true) ||
                          (isGnosisAccount ? !safeInfo : false)
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
                        overlayClassName="rectangle watcSign__tooltip"
                        title={cantProcessReason}
                      >
                        <div className="w-[172px] relative flex items-center">
                          <Button
                            type="primary"
                            size="large"
                            className="w-[172px]"
                            onClick={() => handleAllow()}
                            disabled={true}
                          >
                            {t('Proceed')}
                          </Button>
                          <img
                            src={IconInfo}
                            className="absolute right-[40px]"
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
                          (selectedGas ? selectedGas.price <= 0 : true) ||
                          (isGnosisAccount ? !safeInfo : false)
                        }
                        loading={isGnosisAccount ? !safeInfo : false}
                        onClick={() => handleAllow(true)}
                      >
                        {t('Sign')}
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
            okText={t('Sign')}
            cancelText={t('Cancel')}
            preprocessSuccess={preprocessSuccess}
          />
        )}
      </div>
    </>
  );
};

export default SignTx;
