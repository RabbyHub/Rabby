import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { URDecoder } from '@ngraveio/bc-ur';
import QRCodeReader from 'ui/component/QRCodeReader';
import { useWallet } from 'ui/utils';
import { openInternalPageInTab } from 'ui/utils/webapi';
import './style.less';
import * as Sentry from '@sentry/browser';
import { HARDWARE_KEYRING_TYPES, WALLET_BRAND_CONTENT } from 'consts';
import QRCodeCheckerDetail from 'ui/views/QRCodeCheckerDetail';
import clsx from 'clsx';

type Valueof<T> = T[keyof T];

export const QRCodeConnect = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const decoder = useRef(new URDecoder());
  const [errorMessage, setErrorMessage] = useState('');
  const [scan, setScan] = useState(true);
  const { search } = useLocation();
  const brand = new URLSearchParams(search).get('brand');

  if (!brand) {
    history.goBack();
    return null;
  }

  const brandInfo: Valueof<typeof WALLET_BRAND_CONTENT> =
    WALLET_BRAND_CONTENT[brand] || WALLET_BRAND_CONTENT.Keystone;

  const showErrorChecker = useMemo(() => {
    return errorMessage !== '';
  }, [errorMessage]);

  const handleScanQRCodeSuccess = async (data) => {
    try {
      decoder.current.receivePart(data);
      if (decoder.current.isComplete()) {
        const result = decoder.current.resultUR();
        let stashKeyringId;
        if (result.type === 'crypto-hdkey') {
          stashKeyringId = await wallet.submitQRHardwareCryptoHDKey(
            result.cbor.toString('hex')
          );
        } else if (result.type === 'crypto-account') {
          stashKeyringId = await wallet.submitQRHardwareCryptoAccount(
            result.cbor.toString('hex')
          );
        } else {
          Sentry.captureException(
            new Error('QRCodeError ' + JSON.stringify(result))
          );
          setErrorMessage(
            t(
              'Invalid QR code. Please scan the sync QR code of the hardware wallet.'
            )
          );
          return;
        }
        let search = `?hd=${HARDWARE_KEYRING_TYPES.Keystone.type}&brand=${brand}`;
        if (stashKeyringId) {
          search += `&keyringId=${stashKeyringId}`;
        }

        history.push({
          pathname: '/import/select-address',
          state: {
            keyring: HARDWARE_KEYRING_TYPES.Keystone.type,
            keyringId: stashKeyringId,
            brand,
          },
          search,
        });
      }
    } catch (e) {
      Sentry.captureException(`QRCodeError ${e.message}`);
      setScan(false);
      setErrorMessage(
        t(
          'Invalid QR code. Please scan the sync QR code of the hardware wallet.'
        )
      );
    }
  };

  const handleScanQRCodeError = async () => {
    await wallet.setPageStateCache({
      path: history.location.pathname,
      params: {},
      states: form.getFieldsValue(),
    });
    openInternalPageInTab('request-permission?type=camera');
  };

  const handleClickBack = () => {
    if (history.length > 1) {
      history.goBack();
    } else {
      history.replace('/');
    }
  };

  useEffect(() => {
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  const handleScan = () => {
    setErrorMessage('');
    setScan(true);
  };
  return (
    <div className="bg-gray-bg2 h-full flex">
      <main
        className={clsx(
          'bg-white rounded-[12px]',
          'm-auto w-[1000px] h-[750px]',
          'py-[40px]'
        )}
      >
        <div className="font-medium text-gray-title text-center">
          <h1 className="text-[28px] leading-[33px]">{brandInfo.name}</h1>
          <p className="text-15 opacity-80 mt-16">
            Scan the QR code on the {brandInfo.name} hardware wallet
          </p>
        </div>
        <div className="mt-[60px]">
          <img className="w-[80px] h-[80px] mx-auto" src={brandInfo.image} />
        </div>
        <div className="mt-[60px]">
          <div
            className={clsx(
              'm-auto rounded-[10px] p-[16px] bg-white',
              'w-[320px] h-[320px]',
              'border border-[#0000001A]'
            )}
          >
            {scan && (
              <QRCodeReader
                width={288}
                height={288}
                onSuccess={handleScanQRCodeSuccess}
                onError={handleScanQRCodeError}
              />
            )}
          </div>

          {showErrorChecker && (
            <QRCodeCheckerDetail
              visible={showErrorChecker}
              onCancel={handleClickBack}
              data={errorMessage}
              onOk={handleScan}
              okText={t('Try Again')}
              cancelText={t('Cancel')}
            />
          )}
        </div>
      </main>
    </div>
  );
};
