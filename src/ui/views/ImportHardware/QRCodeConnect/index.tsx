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
import Progress from '@/ui/component/Progress';

type Valueof<T> = T[keyof T];

const KEYSTONE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;

export const QRCodeConnect = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const decoder = useRef(new URDecoder());
  const [errorMessage, setErrorMessage] = useState('');
  const [scan, setScan] = useState(false);
  const { search } = useLocation();
  const brand = new URLSearchParams(search).get('brand');
  const stashKeyringIdRef = useRef<number | null>(null);

  if (!brand) {
    history.goBack();
    return null;
  }

  const brandInfo: Valueof<typeof WALLET_BRAND_CONTENT> =
    WALLET_BRAND_CONTENT[brand] || WALLET_BRAND_CONTENT.Keystone;

  const [progress, setProgress] = useState(0);

  const showErrorChecker = useMemo(() => {
    return errorMessage !== '';
  }, [errorMessage]);

  const handleScanQRCodeSuccess = async (data) => {
    try {
      decoder.current.receivePart(data);
      setProgress(Math.floor(decoder.current.estimatedPercentComplete() * 100));
      if (decoder.current.isComplete()) {
        const result = decoder.current.resultUR();
        if (result.type === 'crypto-hdkey') {
          stashKeyringIdRef.current = await wallet.submitQRHardwareCryptoHDKey(
            result.cbor.toString('hex'),
            stashKeyringIdRef.current
          );
        } else if (result.type === 'crypto-account') {
          stashKeyringIdRef.current = await wallet.submitQRHardwareCryptoAccount(
            result.cbor.toString('hex'),
            stashKeyringIdRef.current
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

        goToSelectAddress(stashKeyringIdRef.current);
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

  const goToSelectAddress = async (keyringId?: number | null) => {
    let search = `?hd=${KEYSTONE_TYPE}&brand=${brand}`;
    if (keyringId) {
      search += `&keyringId=${keyringId}`;
    }

    history.push({
      pathname: '/import/select-address',
      state: {
        keyring: KEYSTONE_TYPE,
        keyringId,
        brand,
      },
      search,
    });
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
    wallet.initQRHardware(brand).then((stashKeyringId) => {
      stashKeyringIdRef.current = stashKeyringId;
      wallet
        .requestKeyring(KEYSTONE_TYPE, 'isReady', stashKeyringId)
        .then((res) => {
          if (res) {
            goToSelectAddress(stashKeyringId);
          }
          setScan(true);
        });
    });
    return () => {
      wallet.clearPageStateCache();
    };
  }, []);

  const handleScan = () => {
    setErrorMessage('');
    setScan(true);
    setProgress(0);
    decoder.current = new URDecoder();
  };
  return (
    <div className="bg-r-neutral-bg1 h-full flex">
      <main
        className={clsx(
          'bg-r-neutral-card2 rounded-[12px]',
          'm-auto w-[1000px] h-[750px]',
          'py-[40px]'
        )}
      >
        <div className="font-medium text-r-neutral-body text-center">
          <h1 className="text-[28px] leading-[33px] text-r-neutral-title1">
            {brandInfo.name}
          </h1>
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
              'm-auto rounded-[10px] p-[16px] bg-transparent',
              'w-[320px] h-[320px]',
              'border border-rabby-neutral-line'
            )}
          >
            {scan && (
              <QRCodeReader
                width={288}
                height={288}
                onSuccess={handleScanQRCodeSuccess}
                onError={handleScanQRCodeError}
                className="bg-r-neutral-line"
              />
            )}
          </div>

          {progress > 0 && (
            <div className="mt-[24px] m-auto w-[130px]">
              <Progress percent={progress} />
            </div>
          )}

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
