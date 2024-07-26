import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode.react';
import QRCodeReader from 'ui/component/QRCodeReader';
import { isValidAddress } from 'ethereumjs-util';
import { Popup, StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import { EVENTS, KEYRING_CLASS } from 'consts';
import WatchLogo from 'ui/assets/waitcup.svg';
import IconWalletconnect from 'ui/assets/walletconnect.svg';
import IconScan from 'ui/assets/scan.svg';
import IconArrowDown from 'ui/assets/big-arrow-down.svg';
import IconEnter from 'ui/assets/enter.svg';
import { useMedia } from 'react-use';
import clsx from 'clsx';
import { Modal } from 'ui/component';
import IconBack from 'ui/assets/icon-back.svg';
import { useRepeatImportConfirm } from 'ui/utils/useRepeatImportConfirm';
import eventBus from '@/eventBus';
import { safeJSONParse } from '@/utils';

const ImportWatchAddress = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const [disableKeydown, setDisableKeydown] = useState(false);
  const [walletconnectModalVisible, setWalletconnectModalVisible] = useState(
    false
  );
  const [QRScanModalVisible, setQRScanModalVisible] = useState(false);
  const [walletconnectUri, setWalletconnectUri] = useState('');
  const [ensResult, setEnsResult] = useState<null | {
    addr: string;
    name: string;
  }>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [importedAccounts, setImportedAccounts] = useState<any[]>([]);
  const isWide = useMedia('(min-width: 401px)');
  const [isValidAddr, setIsValidAddr] = useState(false);
  const { show, contextHolder } = useRepeatImportConfirm();
  const ModalComponent = isWide ? Modal : Popup;
  const [run, loading] = useWalletRequest(wallet.importWatchAddress, {
    onSuccess(accounts) {
      setDisableKeydown(false);
      const successShowAccounts = accounts.map((item, index) => {
        return { ...item, index: index + 1 };
      });
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts: successShowAccounts,
          title: t('page.newAddress.importedSuccessfully'),
          editing: true,
          importedAccount: true,
          importedLength: importedAccounts && importedAccounts?.length,
        },
      });
    },
    onError(err) {
      if (err.message?.includes?.('DuplicateAccountError')) {
        const address = safeJSONParse(err.message)?.address;
        show({
          address,
          type: KEYRING_CLASS.WATCH,
        });
      } else {
        setDisableKeydown(false);
        form.setFields([
          {
            name: 'address',
            errors: [
              err?.message || t('page.newAddress.addContacts.notAValidAddress'),
            ],
          },
        ]);
      }
    },
  });
  const handleConfirmENS = (result: string) => {
    form.setFieldsValue({
      address: result,
    });
    setIsValidAddr(true);
    setTags([`ENS: ${ensResult!.name}`]);
    setEnsResult(null);
  };
  const handleKeyDown = useMemo(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'enter') {
        if (ensResult) {
          e.preventDefault();
          handleConfirmENS(ensResult.addr);
        }
      }
    };
    return handler;
  }, [ensResult]);
  const handleScanAccount = useCallback((data) => {
    const address = data.address;
    form.setFieldsValue({
      address,
    });
    if (isValidAddress(address)) {
      setIsValidAddr(true);
    }
    setWalletconnectModalVisible(false);
  }, []);
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    eventBus.addEventListener(
      EVENTS.WALLETCONNECT.SCAN_ACCOUNT,
      handleScanAccount
    );
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      eventBus.removeEventListener(
        EVENTS.WALLETCONNECT.SCAN_ACCOUNT,
        handleScanAccount
      );
    };
  }, [handleKeyDown]);
  const handleImportByWalletconnect = async () => {
    const uri = await wallet.walletConnectScanAccount();

    setWalletconnectUri(uri!);
    setWalletconnectModalVisible(true);
  };
  const handleWalletconnectModalCancel = () => {
    setWalletconnectModalVisible(false);
  };
  const handleScanQRCodeSuccess = (data) => {
    form.setFieldsValue({
      address: data,
    });
    if (isValidAddress(data)) {
      setIsValidAddr(true);
    }
    setQRScanModalVisible(false);
    wallet.clearPageStateCache();
  };
  const handleQRScanModalCancel = () => {
    setQRScanModalVisible(false);
  };
  const handleScanQRCodeError = async () => {
    await wallet.setPageStateCache({
      path: history.location.pathname,
      params: {},
      states: form.getFieldsValue(),
    });
    openInternalPageInTab('request-permission?type=camera');
  };
  const handleLoadCache = async () => {
    const cache = await wallet.getPageStateCache();
    if (cache && cache.path === history.location.pathname) {
      form.setFieldsValue(cache.states);
    }
  };
  const handleImportByQrcode = () => {
    setQRScanModalVisible(true);
  };
  const handleValuesChange = async ({ address }: { address: string }) => {
    setTags([]);
    if (!isValidAddress(address)) {
      setIsValidAddr(false);
      try {
        const result = await wallet.openapi.getEnsAddressByName(address);
        setDisableKeydown(true);
        if (result && result.addr) {
          setEnsResult(result);
        }
      } catch (e) {
        setEnsResult(null);
      }
    } else {
      setIsValidAddr(true);
      setEnsResult(null);
    }
  };
  const handleNextClick = () => {
    const address = form.getFieldValue('address');
    run(address);
  };
  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };
  const allAccounts = async () => {
    const importedAccounts = await wallet.getTypedAccounts(KEYRING_CLASS.WATCH);
    if (importedAccounts && importedAccounts[0]?.accounts) {
      setImportedAccounts(importedAccounts[0]?.accounts);
    }
  };
  useEffect(() => {
    handleLoadCache();
    allAccounts();
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);
  return (
    <StrayPageWithButton
      custom={isWide}
      onSubmit={handleNextClick}
      spinning={loading}
      form={form}
      hasDivider
      noPadding
      className={clsx('import-watchmode', isWide && 'rabby-stray-page')}
      formProps={{
        onValuesChange: handleValuesChange,
      }}
      disableKeyDownEvent={disableKeydown}
      onBackClick={handleClickBack}
      NextButtonContent={t('global.confirm')}
      nextDisabled={!isValidAddr}
    >
      {contextHolder}
      <header className="create-new-header create-password-header h-[264px] res dark:bg-r-blue-disable">
        <div className="rabby-container">
          <img
            className="icon-back z-10 relative"
            src={IconBack}
            alt="back"
            onClick={handleClickBack}
          />
          <img className="w-[80px] h-[75px] mb-28 mx-auto" src={WatchLogo} />
          <p className="text-24 mb-4 mt-0 text-white text-center font-bold">
            {t('page.newAddress.addContacts.content')}
          </p>
          <p className="text-14 mb-0 mt-4 text-white  text-center">
            {t('page.newAddress.addContacts.description')}
          </p>
        </div>
      </header>
      <div className="rabby-container widget-has-ant-input">
        <div className="relative">
          <Form.Item
            className="pt-32 px-20"
            name="address"
            rules={[
              {
                required: true,
                message: t('page.newAddress.addContacts.required'),
              },
            ]}
          >
            <Input
              placeholder={t('page.newAddress.addContacts.addressEns')}
              size="large"
              maxLength={44}
              className="border-bright-on-active"
              autoFocus
              spellCheck={false}
            />
          </Form.Item>
          {tags.length > 0 && (
            <ul className="tags">
              {tags.map((tag) => (
                <li className="border-none pl-0 py-0" key={tag}>
                  {tag}
                </li>
              ))}
            </ul>
          )}
          {ensResult && (
            <div
              className="ens-search"
              onClick={() => handleConfirmENS(ensResult.addr)}
            >
              <div className="ens-search__inner">
                {ensResult.addr}
                <img className="icon icon-enter" src={IconEnter} />
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-between px-20">
          <div
            className="w-[172px] import-watchmode__button"
            onClick={handleImportByWalletconnect}
          >
            <img src={IconWalletconnect} className="icon icon-walletconnect" />
            {t('page.newAddress.addContacts.scanViaMobileWallet')}
          </div>
          <div
            className="w-[172px] import-watchmode__button"
            onClick={handleImportByQrcode}
          >
            <img src={IconScan} className="icon icon-walletconnect" />
            {t('page.newAddress.addContacts.scanViaPcCamera')}
          </div>
        </div>
      </div>
      <ModalComponent
        closable={false}
        height={400}
        className="walletconnect-modal"
        visible={walletconnectModalVisible}
        onCancel={handleWalletconnectModalCancel}
        // width={360}
      >
        <p className="guide">{t('page.newAddress.addContacts.scanQRCode')}</p>
        <div className="symbol">
          <img src={IconWalletconnect} className="icon icon-walletconnect" />
          {t('page.newAddress.addContacts.walletConnect')}
        </div>
        {walletconnectUri && (
          <>
            <div className="qrcode">
              <QRCode value={walletconnectUri} size={176} />
            </div>
            <div className="text-12 text-r-neutral-foot text-center mt-12">
              {t('page.newAddress.addContacts.walletConnectVPN')}
            </div>
          </>
        )}
      </ModalComponent>
      <ModalComponent
        closable={false}
        height={400}
        className="walletconnect-modal"
        visible={QRScanModalVisible}
        onCancel={handleQRScanModalCancel}
        // width={360}
        destroyOnClose
      >
        <p className="guide">{t('page.newAddress.addContacts.cameraTitle')}</p>
        <img src={IconArrowDown} className="icon icon-arrow-down" />
        <div className="qrcode">
          <QRCodeReader
            width={176}
            height={176}
            onSuccess={handleScanQRCodeSuccess}
            onError={handleScanQRCodeError}
          />
        </div>
      </ModalComponent>
    </StrayPageWithButton>
  );
};

export default ImportWatchAddress;
