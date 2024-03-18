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
import {
  HARDWARE_KEYRING_TYPES,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from 'consts';
import QRCodeCheckerDetail from 'ui/views/QRCodeCheckerDetail';
import clsx from 'clsx';
import Progress from '@/ui/component/Progress';
import PillsSwitch from '@/ui/component/PillsSwitch';
import { Button } from 'antd';
import { query2obj } from '@/ui/utils/url';

const KEYSTONE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;

enum ConnectType {
  QRCode = 'qrcode',
  USB = 'usb',
}

export const KeystoneConnect = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const decoder = useRef(new URDecoder());
  const [errorMessage, setErrorMessage] = useState('');
  const [connectType, setConnectType] = useState<ConnectType>(
    ConnectType.QRCode
  );
  const [scan, setScan] = useState(false);
  const stashKeyringIdRef = useRef<number | null>(null);
  const { search } = useLocation();
  const qs = query2obj(search);
  const isReconnect = !!qs.reconnect;
  const brandInfo = WALLET_BRAND_CONTENT.Keystone;

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
    let search = `?hd=${KEYSTONE_TYPE}&brand=${WALLET_BRAND_TYPES.KEYSTONE}`;
    if (keyringId) {
      search += `&keyringId=${keyringId}`;
    }

    history.push({
      pathname: '/import/select-address',
      state: {
        keyring: KEYSTONE_TYPE,
        keyringId,
        brand: WALLET_BRAND_TYPES.KEYSTONE,
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
    wallet
      .initQRHardware(WALLET_BRAND_TYPES.KEYSTONE)
      .then((stashKeyringId) => {
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

  const onConnectViaUSB = () => {
    history.push({
      pathname: '/request-permission',
      search: isReconnect ? '?type=keystone&reconnect=1' : '?type=keystone',
    });
  };

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
        <div className="mt-[40px] mb-[20px]">
          <img className="w-[80px] h-[80px] mx-auto" src={brandInfo.image} />
        </div>
        <div className="font-medium text-r-neutral-body text-center">
          <h1 className="text-[28px] leading-[33px] text-r-neutral-title1">
            {brandInfo.name}
          </h1>
          <PillsSwitch
            value={connectType}
            options={
              [
                {
                  key: ConnectType.QRCode,
                  label: 'QR code',
                },
                {
                  key: ConnectType.USB,
                  label: 'USB',
                },
              ] as const
            }
            onTabChange={setConnectType}
            className="bg-r-neutral-line mt-[40px] mb-[8px]"
            itemClassname="text-[15px] w-[148px] h-[40px]"
            itemClassnameActive="bg-r-neutral-bg-1"
            itemClassnameInActive={clsx('text-r-neutral-body')}
          />
          {connectType === ConnectType.QRCode ? (
            <p className="text-15 opacity-80 mt-16">
              Scan the QR code on the {brandInfo.name} hardware wallet
            </p>
          ) : null}
        </div>
        {connectType === ConnectType.QRCode ? (
          <div className="mt-[24px]">
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
                okText={t('global.tryAgain')}
                cancelText={t('global.Cancel')}
              />
            )}
          </div>
        ) : (
          <div className="connect-keystone mt-[6px]">
            <p className="text-r-neutral-title1 text-14 leading-[20px] mb-[20px]">
              {t('page.dashboard.hd.keystone.title')}
            </p>
            <ul className="list-decimal w-[240px] pl-[20px] m-auto text-r-neutral-title1 text-14 leading-[20px] mb-[35px]">
              <li>{t('page.dashboard.hd.keystone.doc1')}</li>
              <li>{t('page.dashboard.hd.keystone.doc2')}</li>
              <li>{t('page.dashboard.hd.keystone.doc3')}</li>
            </ul>
            <img src="/images/keystone-plug.svg" className="keystone-plug" />
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              className="w-[200px]"
              onClick={onConnectViaUSB}
            >
              {t('global.next')}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};
