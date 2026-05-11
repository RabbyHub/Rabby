import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Input, Form } from 'antd';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode.react';
import QRCodeReader from 'ui/component/QRCodeReader';
import { isValidAddress } from '@ethereumjs/util';
import { debounce } from 'lodash';
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
import { resolveEnsAddressByName } from '@/ui/utils/ens';
import WatchLogo from 'ui/assets/watch-only-hero.svg';
import { useCreateAddressActions } from './AddAddress/useCreateAddress';
import { RcWatchAddressScan } from '../assets/add-address';
import { is } from 'immer/dist/internal';

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
  const [disableKeydown, setDisableKeydown] = useState(false);

  const [QRScanModalVisible, setQRScanModalVisible] = useState(false);
  const [ensResult, setEnsResult] = useState<null | {
    addr: string;
    name: string;
  }>(null);
  const [tags, setTags] = useState<string[]>([]);
  const isWide = useMedia('(min-width: 401px)');
  const [isValidAddr, setIsValidAddr] = useState(false);
  const { show, contextHolder } = useRepeatImportConfirm();
  const ModalComponent = isWide ? Modal : Popup;
  const [run, loading] = useWalletRequest(wallet.importWatchAddress, {
    onSuccess(accounts) {
      setDisableKeydown(false);
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
        if (ensResult && form.getFieldValue('address') === ensResult.name) {
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
      path: '/import/watch-address',
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
  const debouncedResolveENS = useMemo(
    () =>
      debounce(async (address: string) => {
        try {
          const result = await resolveEnsAddressByName(address, wallet);
          setDisableKeydown(true);
          if (result && result.addr && result.addr.startsWith('0x')) {
            setEnsResult(result);
          }
        } catch (e) {
          setEnsResult(null);
        }
      }, 300),
    [wallet]
  );

  const handleValuesChange = ({ address }: { address: string }) => {
    setTags([]);
    setEnsResult(null);
    const trimmedAddress = address?.trim();
    if (isValidAddress(trimmedAddress)) {
      setIsValidAddr(true);
      debouncedResolveENS.cancel();
      form.setFieldsValue({
        address: trimmedAddress,
      });
      return;
    }

    setIsValidAddr(false);
    debouncedResolveENS(trimmedAddress);
  };
  const handleNextClick = () => {
    const address = form.getFieldValue('address');
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
    handleLoadCache();
    return () => {
      debouncedResolveENS.cancel();
      wallet.clearPageStateCache();
    };
  }, [debouncedResolveENS]);
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
      disableKeyDownEvent={disableKeydown}
      onBackClick={handleClickBack}
      NextButtonContent={t('global.confirm')}
      nextDisabled={!isValidAddr}
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
            rules={[
              {
                required: true,
                message: t('page.newAddress.addContacts.required'),
              },
            ]}
          >
            <InputWithScanIcon handleImportByQrcode={handleImportByQrcode} />
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
