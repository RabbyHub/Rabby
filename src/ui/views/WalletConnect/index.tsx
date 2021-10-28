import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Form, message } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WalletConnect from '@walletconnect/client';
import { useWallet, useWalletRequest } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import IconBack from 'ui/assets/gobackwhite.svg';
import { ScanCopyQRCode } from 'ui/component';
import eventBus from '@/eventBus';
import { WALLETCONNECT_STATUS_MAP, EVENTS } from 'consts';
import './style.less';
const WalletConnectTemplate = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation<{ brand: any }>();
  const wallet = useWallet();
  const [connectStatus, setConnectStatus] = useState(
    WALLETCONNECT_STATUS_MAP.PENDING
  );
  const [connectError, setConnectError] = useState<null | {
    code?: number;
    message?: string;
  }>(null);
  const [result, setResult] = useState('');

  const [walletconnectUri, setWalletconnectUri] = useState('');
  const [ensResult, setEnsResult] = useState<null | {
    addr: string;
    name: string;
  }>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [showURL, setShowURL] = useState(false);
  const [stashId, setStashId] = useState<number | null>(null);
  const { name, id, icon, brand, image } = location.state!.brand;

  const [run, loading] = useWalletRequest(wallet.importWalletConnect, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/import/success',
        state: {
          accounts,
          brand,
          image,
          title: t('Successfully created'),
        },
      });
    },
    onError(err) {
      message.error(t(err?.message));
      handleImportByWalletconnect();
      return;
    },
  });
  const handleImportByWalletconnect = async () => {
    const { uri, stashId } = await wallet.initWalletConnect(brand);
    await setWalletconnectUri(uri);
    await setStashId(stashId);
    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.STATUS_CHANGED,
      ({ status, payload }) => {
        setConnectStatus(status);
        switch (status) {
          case WALLETCONNECT_STATUS_MAP.CONNECTED:
            setResult(payload);
            run(payload, brand, stashId);
            break;
          case WALLETCONNECT_STATUS_MAP.FAILD:
          case WALLETCONNECT_STATUS_MAP.REJECTED:
            handleImportByWalletconnect();
            if (payload.code) {
              setConnectError({ code: payload.code });
            } else {
              setConnectError((payload.params && payload.params[0]) || payload);
            }
            break;
          case WALLETCONNECT_STATUS_MAP.SIBMITTED:
            setResult(payload);
            break;
        }
      }
    );
  };
  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };
  useEffect(() => {
    handleImportByWalletconnect();
  }, []);
  return (
    <div className="wallet-connect">
      <div className="create-new-header create-password-header h-[220px]">
        <img src={IconBack} className="goback" onClick={handleClickBack} />
        <img
          className="unlock-logo w-[80px] h-[75px] mb-20 mx-auto"
          src={image}
        />
        <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
          {t(name)}
        </p>
        <p className="text-14 mb-0 mt-4 text-white font-bold text-center">
          {t('Scan with your wallet app')}
        </p>
        <img src="/images/watch-mask.png" className="mask" />
      </div>
      <ScanCopyQRCode
        showURL={showURL}
        changeShowURL={setShowURL}
        qrcodeURL={walletconnectUri}
        refreshFun={handleImportByWalletconnect}
      />
    </div>
  );
};

export default WalletConnectTemplate;
