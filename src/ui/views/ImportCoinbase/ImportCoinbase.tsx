import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWallet, useWalletRequest } from 'ui/utils';
import IconBack from 'ui/assets/icon-back.svg';
import { ScanCopyQRCode } from 'ui/component';
import eventBus from '@/eventBus';
import { EVENTS, WALLET_BRAND_CONTENT } from 'consts';
import './style.less';
import { useSessionStatus } from '@/ui/component/WalletConnect/useSessionStatus';
import { SESSION_STATUS_MAP } from '@rabby-wallet/eth-coinbase-keyring/dist/type';

const COINBASE = WALLET_BRAND_CONTENT.Coinbase;

export const ImportCoinbase = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [result, setResult] = useState('');
  const [walletconnectUri, setWalletconnectUri] = useState('');
  const [showURL, setShowURL] = useState(false);
  const [ready, setReady] = useState(false);
  const { status: sessionStatus } = useSessionStatus();
  const [runParams, setRunParams] = useState<
    Parameters<typeof run> | undefined
  >();

  const [run, loading] = useWalletRequest(wallet.importCoinbase, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts,
          editing: true,
          title: t('page.newAddress.walletConnect.connectedSuccessfully'),
          importedAccount: true,
        },
      });
    },
    onError(err) {
      if (!err?.message.includes('duplicate')) {
        message.error(t(err?.message as any));
      }
      handleImportCoinbase();
      return;
    },
  });

  const handleRun = async (options: Parameters<typeof run>) => {
    const [account] = options as any;

    options[0] = account;

    run(...options);
  };

  const handleImportCoinbase = async () => {
    const { uri } = await wallet.connectCoinbase();
    setWalletconnectUri(uri!);
  };

  useEffect(() => {
    if (sessionStatus === 'CONNECTED' && runParams?.length) {
      handleRun(runParams);
    } else {
      setRunParams(undefined);
    }
  }, [sessionStatus, runParams]);

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };

  const handleRefresh = () => {
    handleImportCoinbase();
  };

  useEffect(() => {
    if (ready) handleImportCoinbase();
  }, []);

  const handleStatusChange = ({ status, account, payload }) => {
    switch (status) {
      case SESSION_STATUS_MAP.CONNECTED:
        setResult(account.address);
        setRunParams([account]);
        break;
      case SESSION_STATUS_MAP.REJECTED:
        handleImportCoinbase();
        break;
      default:
        break;
    }
  };

  const init = async () => {
    handleImportCoinbase();
    setReady(true);
  };

  useEffect(() => {
    init();
    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.SESSION_STATUS_CHANGED,
      handleStatusChange
    );

    return () => {
      eventBus.removeEventListener(
        EVENTS.WALLETCONNECT.SESSION_STATUS_CHANGED,
        handleStatusChange
      );
    };
  }, []);

  return (
    <div className="import-coinbase pb-0">
      <div className="create-new-header create-password-header h-[180px] py-[20px] dark:bg-r-blue-disable">
        <img
          src={IconBack}
          className="icon-back mb-0 relative z-10"
          onClick={handleClickBack}
        />
        <div className="relative w-[60px] h-[60px] mb-16 mx-auto mt-[-4px]">
          <img className="unlock-logo w-full h-full" src={COINBASE.image} />
        </div>
        <p className="text-[17px] leading-none mb-8 mt-0 text-white text-center font-bold">
          {t('page.newAddress.walletConnect.connectYour')} {COINBASE.name}{' '}
          Wallet
        </p>
      </div>
      <ScanCopyQRCode
        showURL={showURL}
        changeShowURL={setShowURL}
        qrcodeURL={walletconnectUri}
        refreshFun={handleRefresh}
        canChangeBridge={false}
        brandName={COINBASE.name}
      />
    </div>
  );
};
