import React, { useEffect, useState } from 'react';
import { Spin } from 'ui/component';
import SecurityCheckBar from './SecurityCheckBar';
import SecurityCheckDetail from './SecurityCheckDetail';
import { Button } from 'antd';
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
  const [{ data, from, gas, gasPrice, nonce, to, value }] = params.data;
  const [tx, setTx] = useState<Tx>({
    chainId,
    data,
    from,
    gas,
    gasPrice,
    nonce,
    to,
    value,
  });
  const [realNonce, setRealNonce] = useState('');

  const checkTx = async (address: string) => {
    const res = await wallet.openapi.checkTx(tx, origin, address);
    setSecurityCheckStatus(res.decision);
    setSecurityCheckAlert(res.alert);
    setSecurityCheckDetail(res);
  };

  const explainTx = async (address: string) => {
    const res = await wallet.openapi.explainTx(
      tx,
      origin,
      address,
      tx.from !== tx.to
    );
    setTxDetail(res);
    setRealNonce(res.tx.nonce);
    setPreprocessSuccess(res.pre_exec.success);
    if (!res.pre_exec.success) {
      setShowSecurityCheckDetail(true);
    }
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

  const handleAllow = () => {
    resolveApproval({
      ...tx,
      nonce: realNonce,
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
                  onClick={handleAllow}
                >
                  Allow
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
            onOk={handleAllow}
            okText="Sign"
            preprocessSuccess={preprocessSuccess}
          />
        )}
      </div>
    </Spin>
  );
};

export default SignTx;
