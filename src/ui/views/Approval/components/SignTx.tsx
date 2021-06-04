import React, { useEffect, useState } from 'react';
import { intToHex } from 'ethereumjs-util';
import { Spin } from 'ui/component';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';
import { Button, Modal } from 'antd';
import {
  ExplainTxResponse,
  GasLevel,
  SecurityCheckResponse,
  SecurityCheckDecision,
  Tx,
} from 'background/service/openapi';
import { CHAINS, TX_TYPE_ENUM } from 'consts';
import { useWallet, useApproval } from 'ui/utils';
import Approve from './TxComponents/Approve';
import Cancel from './TxComponents/Cancel';
import Sign from './TxComponents/Sign';
import CancelTx from './TxComponents/CancelTx';
import Send from './TxComponents/Send';
import GasSelector from './TxComponents/GasSelecter';
import { WaitingSignComponent } from './SignText';

const confirmText = {
  [TX_TYPE_ENUM.APPROVE]: 'Approve',
  [TX_TYPE_ENUM.SEND]: 'Send',
  [TX_TYPE_ENUM.SIGN_TX]: 'Sign',
  [TX_TYPE_ENUM.CANCEL_APPROVE]: 'Confirm',
  [TX_TYPE_ENUM.CANCEL_TX]: 'Confirm',
};

const SignTx = ({ params, origin }) => {
  const [isReady, setIsReady] = useState(false);
  const [txDetail, setTxDetail] = useState<ExplainTxResponse | null>(null);
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
  const [, resolveApproval, rejectApproval] = useApproval();
  const wallet = useWallet();
  const session = params.session;
  const site = wallet.getConnectedSite(session.origin);
  let chainId = params.data.chainId;
  if (!chainId) {
    chainId = CHAINS[site!.chain].id;
  }
  const [{ data = '0x', from, gas, gasPrice, nonce, to, value }] = params.data;
  const [tx, setTx] = useState<Tx>({
    chainId,
    data: data || '0x', // can not execute with empty string, use 0x instead
    from,
    gas,
    gasPrice,
    nonce,
    to,
    value,
  });
  const [realNonce, setRealNonce] = useState('');
  const [gasLimit, setGasLimit] = useState(gas);

  const checkTx = async (address: string) => {
    const res = await wallet.openapi.checkTx(
      {
        ...tx,
        nonce: tx.nonce || '0x1',
        data: tx.data,
        value: tx.value || '0x0',
        gas: tx.gas || '',
      }, // set a mock nonce for check if dapp not set it
      origin,
      address
    );
    setSecurityCheckStatus(res.decision);
    setSecurityCheckAlert(res.alert);
    setSecurityCheckDetail(res);
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
      tx.from !== tx.to
    );
    if (!res.pre_exec.success) {
      Modal.error({
        title: 'Error',
        content: 'Pre-execution not passed, please try again',
        onOk: rejectApproval,
      });
      return;
    }
    if (!gasLimit) {
      // use server response gas limit
      setGasLimit(res.tx.gas);
    }
    setTxDetail(res);
    setRealNonce(res.tx.nonce);
    setPreprocessSuccess(res.pre_exec.success);
    if (!res.pre_exec.success) {
      setShowSecurityCheckDetail(true);
    }
  };

  const getDefaultGas = async () => {
    const chain = Object.keys(CHAINS)
      .map((key) => CHAINS[key])
      .find((item) => item.id === chainId);
    const gas = await wallet.openapi.gasMarket(chain!.serverId);
    setTx({
      ...tx,
      gasPrice: intToHex(Math.max(...gas.map((item) => item.price))),
    });
  };

  const init = async () => {
    const currentAccount = await wallet.getCurrentAccount();
    try {
      setIsReady(false);
      await explainTx(currentAccount!.address);
      await checkTx(currentAccount!.address);
      setIsReady(true);
    } catch (e) {
      // NOTHING
    }
  };

  const handleAllow = async (doubleCheck = false) => {
    if (!doubleCheck && securityCheckStatus !== 'pass') {
      setShowSecurityCheckDetail(true);
      return;
    }

    const currentAccount = await wallet.getCurrentAccount();
    if (currentAccount?.type && WaitingSignComponent[currentAccount.type]) {
      resolveApproval({
        uiRequestComponent: WaitingSignComponent[currentAccount.type],
        type: currentAccount.type,
        address: currentAccount.address,
      });

      return;
    }

    resolveApproval({
      ...tx,
      nonce: realNonce,
      gas: gasLimit,
    });
  };

  const handleGasChange = (gas: GasLevel) => {
    setTx({
      ...tx,
      gasPrice: `0x${gas.price.toString(16)}`,
    });
  };

  const handleCancel = () => {
    rejectApproval('User Reject');
  };

  useEffect(() => {
    if (!tx.gasPrice) {
      // use minimum gas as default gas if dapp not set gasPrice
      getDefaultGas();
      return;
    }
    init();
  }, [tx]);

  return (
    <Spin spinning={!isReady}>
      <div className="approval-tx">
        {txDetail && (
          <>
            <div className="site-card">
              <img className="icon icon-site" src={session.icon} />
              <div className="site-info">
                <p className="font-medium text-gray-subTitle mb-0 text-13">
                  {session.origin}
                </p>
                <p className="text-12 text-gray-content mb-0">{session.name}</p>
              </div>
              <div className="chain-info">
                <img
                  src={CHAINS[site!.chain].logo}
                  alt={CHAINS[site!.chain].name}
                  className="icon icon-chain"
                />
                <span>{CHAINS[site!.chain].name}</span>
              </div>
            </div>
            {txDetail.pre_exec.success &&
              txDetail.pre_exec.tx_type === TX_TYPE_ENUM.APPROVE && (
                <Approve data={txDetail} />
              )}
            {txDetail.pre_exec.success &&
              txDetail.pre_exec.tx_type === TX_TYPE_ENUM.CANCEL_APPROVE && (
                <Cancel data={txDetail} />
              )}
            {txDetail.pre_exec.success &&
              txDetail.pre_exec.tx_type === TX_TYPE_ENUM.SIGN_TX && (
                <Sign data={txDetail} />
              )}
            {txDetail.pre_exec.success &&
              txDetail.pre_exec.tx_type === TX_TYPE_ENUM.CANCEL_TX && (
                <CancelTx />
              )}
            {txDetail.pre_exec.success &&
              txDetail.pre_exec.tx_type === TX_TYPE_ENUM.SEND && (
                <Send data={txDetail} />
              )}
            <footer className="connect-footer">
              {txDetail.pre_exec.success && (
                <GasSelector
                  tx={txDetail.tx}
                  gas={txDetail.gas}
                  nativeToken={txDetail.native_token}
                  onChange={handleGasChange}
                />
              )}
              <SecurityCheckBar
                status={securityCheckStatus}
                alert={securityCheckAlert}
              />
              <div className="action-buttons flex justify-between">
                <Button
                  type="primary"
                  size="large"
                  className="w-[172px]"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  size="large"
                  className="w-[172px]"
                  onClick={() => handleAllow()}
                >
                  {securityCheckStatus === 'pass'
                    ? confirmText[txDetail?.pre_exec.tx_type] || 'Confirm'
                    : 'Continue'}
                </Button>
              </div>
            </footer>
          </>
        )}
        {securityCheckDetail && (
          <SecurityCheckDetail
            visible={showSecurityCheckDetail}
            onCancel={() => setShowSecurityCheckDetail(false)}
            data={securityCheckDetail}
            onOk={() => handleAllow(true)}
            okText={
              (txDetail && confirmText[txDetail.pre_exec.tx_type]) || 'Confirm'
            }
            preprocessSuccess={preprocessSuccess}
          />
        )}
      </div>
    </Spin>
  );
};

export default SignTx;
