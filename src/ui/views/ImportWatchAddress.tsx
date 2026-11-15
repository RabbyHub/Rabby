import React, { useState, useEffect, useCallback } from 'react';
import { Input, Form, Spin } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode.react';
import QRCodeReader from 'ui/component/QRCodeReader';
import { isValidAddress } from '@ethereumjs/util';
import { Popup, StrayPageWithButton } from 'ui/component';
import { useWallet, useWalletRequest } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import { EVENTS, KEYRING_CLASS } from 'consts';
import { ReactComponent as RcIconArrowDown } from 'ui/assets/big-arrow-down.svg';
import IconEnter from 'ui/assets/enter.svg';
import { useMedia } from 'react-use';
import clsx from 'clsx';
import { Modal } from 'ui/component';
import IconBack from 'ui/assets/icon-back.svg';
import { useRepeatImportConfirm } from 'ui/utils/useRepeatImportConfirm';
import eventBus from '@/eventBus';
import { safeJSONParse } from '@/utils';
import { useEnsInputResolver } from '@/ui/hooks/useEnsInputResolver';
import WatchLogo from 'ui/assets/watch-only-hero.svg';
import { useCreateAddressActions } from './AddAddress/useCreateAddress';
import { RcWatchAddressScan } from '../assets/add-address';

const ImportWatchAddress: React.FC<{
  isInModal?: boolean;
  onBack?(): void;
  onNavigate?(type: string, state?: Record<string, any>): void;
}> = ({ isInModal, onBack, onNavigate }) => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const { openSuccessPage } = useCreateAddressActions({ onNavigate });
  const [form] = Form.useForm();
  const inputAddress = Form.useWatch('address', form) || '';
  const { ensResult, isPending, isNameNotFound } = useEnsInputResolver(
    inputAddress,
    wallet
  );

  const [QRScanModalVisible, setQRScanModalVisible] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const isWide = useMedia('(min-width: 401px)');
  const isValidAddr = isValidAddress(inputAddress.trim());
  const { show, contextHolder } = useRepeatImportConfirm();
  const ModalComponent = isWide ? Modal : Popup;
  const [run, loading] = useWalletRequest(wallet.importWatchAddress, {
    onSuccess(accounts) {
      openSuccessPage(
        {
          addresses: accounts.map((item) => ({
            address: item.address,
            alias: '',
          })),
          publicKey: '',
          title: t('page.newAddress.addressAdded'),
        },
        { replace: true }
      );
    },
    onError(err) {
      if (err.message?.includes?.('DuplicateAccountError')) {
        const address = safeJSONParse(err.message)?.address;
        show({
          address,
          type: KEYRING_CLASS.WATCH,
        });
      } else {
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
  const setInputAddress = useCallback(
    (address: string) => {
      const trimmedAddress = address.trim();
      form.setFieldsValue({
        address: isValidAddress(trimmedAddress) ? trimmedAddress : address,
      });
      setTags([]);
    },
    [form]
  );
  const handleConfirmENS = useCallback(() => {
    if (
      !ensResult ||
      form.getFieldValue('address') !== inputAddress ||
      !isValidAddress(ensResult.addr)
    ) {
      return;
    }
    setInputAddress(ensResult.addr);
    setTags([`ENS: ${ensResult.name}`]);
  }, [ensResult, form, inputAddress, setInputAddress]);
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'enter' && ensResult) {
        e.preventDefault();
        handleConfirmENS();
      }
    },
    [ensResult, handleConfirmENS]
  );
  const handleScanAccount = useCallback(
    (data) => setInputAddress(data.address),
    [setInputAddress]
  );
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
  }, [handleKeyDown, handleScanAccount]);

  const handleScanQRCodeSuccess = (data) => {
    setInputAddress(data);
    setQRScanModalVisible(false);
    wallet.clearPageStateCache();
  };
  const handleQRScanModalCancel = () => {
    setQRScanModalVisible(false);
  };
  const handleScanQRCodeError = async () => {
    await wallet.setPageStateCache({
      path: '/import/watch-address',
      params: {},
      states: form.getFieldsValue(),
    });
    openInternalPageInTab('request-permission?type=camera');
  };
  const handleImportByQrcode = () => {
    setQRScanModalVisible(true);
  };
  const handleValuesChange = ({ address }: { address: string }) => {
    setTags([]);
    const trimmedAddress = address?.trim();
    if (isValidAddress(trimmedAddress)) {
      setInputAddress(trimmedAddress);
    }
  };
  const handleNextClick = () => {
    const address = form.getFieldValue('address')?.trim();
    if (!isValidAddress(address) || loading) {
      return;
    }
    run(address);
  };
  const handleClickBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };
  useEffect(() => {
    let active = true;
    const handleLoadCache = async () => {
      const cache = await wallet.getPageStateCache();
      if (active && cache && cache.path === history.location.pathname) {
        setInputAddress(cache.states?.address || '');
      }
    };
    handleLoadCache();
    return () => {
      active = false;
      wallet.clearPageStateCache();
    };
  }, [history.location.pathname, setInputAddress, wallet]);
  return (
    <StrayPageWithButton
      custom={isWide}
      onSubmit={handleNextClick}
      spinning={loading}
      form={form}
      hasDivider
      noPadding
      className={clsx(
        'import-watchmode',
        isWide && 'rabby-stray-page',
        isInModal ? 'min-h-0 h-[600px] overflow-auto' : ''
      )}
      formProps={{
        onValuesChange: handleValuesChange,
      }}
      onBackClick={handleClickBack}
      NextButtonContent={t('global.confirm')}
      footerClassName="lg:bottom-0"
      nextDisabled={!isValidAddr || isPending || loading}
    >
      {contextHolder}
      <header className="create-new-header create-password-header h-[180px] py-[20px] dark:bg-r-blue-disable">
        <div className={clsx('rabby-container', isInModal ? 'w-full' : '')}>
          <img
            className="icon-back mb-0 z-10 relative"
            src={IconBack}
            alt="back"
            onClick={handleClickBack}
          />
          <div className="relative -top-10">
            <img className="w-[60px] h-[60px] mb-10 mx-auto" src={WatchLogo} />
            <p className="text-20 mb-4 mt-0 text-white text-center font-bold">
              {t('page.newAddress.addContacts.content')}
            </p>
            <p className="text-14 mb-0 mt-0 text-white text-center">
              {t('page.newAddress.addContacts.description')}
            </p>
          </div>
        </div>
      </header>
      <div className="rabby-container widget-has-ant-input">
        <div className="relative">
          <Form.Item
            className="pt-32 px-20"
            name="address"
            validateStatus={isNameNotFound ? 'error' : undefined}
            help={
              isNameNotFound
                ? t('page.newAddress.addContacts.notAValidAddress')
                : undefined
            }
            rules={[
              {
                required: true,
                message: t('page.newAddress.addContacts.required'),
              },
            ]}
          >
            <InputWithScanIcon handleImportByQrcode={handleImportByQrcode} />
          </Form.Item>

          {isPending && (
            <div
              role="status"
              className="px-20 mb-16 flex items-center gap-8 text-r-neutral-body text-13"
            >
              <Spin size="small" />
              {t('page.selectToAddress.resolvingAddress')}
            </div>
          )}

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
            <div className="ens-search" onClick={handleConfirmENS}>
              <div className="ens-search__inner">
                {ensResult.addr}
                <img className="icon icon-enter" src={IconEnter} />
              </div>
            </div>
          )}
        </div>
      </div>
      <ModalComponent
        closable={false}
        height={448}
        className="walletconnect-modal"
        visible={QRScanModalVisible}
        onCancel={handleQRScanModalCancel}
        // width={360}
        destroyOnClose
      >
        <p className="guide text-20 font-medium text-r-neutral-title1">
          {t('page.newAddress.addContacts.cameraTitle')}
        </p>
        <RcIconArrowDown className="icon icon-arrow-down" />
        <div className="qrcode border-none w-[260px] h-[260px] mx-auto p-0">
          <QRCodeReader
            width={260}
            height={260}
            onSuccess={handleScanQRCodeSuccess}
            onError={handleScanQRCodeError}
          />
        </div>
      </ModalComponent>
    </StrayPageWithButton>
  );
};

function InputWithScanIcon({
  onChange,
  handleImportByQrcode,
  value,
}: {
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleImportByQrcode: () => void;
  value?: HTMLTextAreaElement['value'];
}) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Input.TextArea
        placeholder={t('page.newAddress.addContacts.addressEns')}
        maxLength={44}
        size="large"
        className="border-bright-on-active leading-normal min-h-[100px]"
        autoFocus
        autoSize
        spellCheck={false}
        onChange={onChange}
        value={value}
      />
      <div
        className="absolute right-[16px] bottom-[16px] flex items-center justify-center cursor-pointer"
        onClick={handleImportByQrcode}
      >
        <RcWatchAddressScan />
      </div>
    </div>
  );
}

export default ImportWatchAddress;
