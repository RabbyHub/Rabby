import { HARDWARE_KEYRING_TYPES, NEXT_KEYRING_ICONS } from '@/constant';
import IconKeystone from '@/ui/assets/walletlogo/keystone-gray.svg';
import { Card } from '@/ui/component/NewUserImport';
import PillsSwitch from '@/ui/component/PillsSwitch';
import Progress from '@/ui/component/Progress';
import { useWallet } from '@/ui/utils';
import { useKeystoneUSBErrorCatcher } from '@/ui/utils/keystone';
import { LedgerHDPathType as HDPathType } from '@/ui/utils/ledger';
import { query2obj } from '@/ui/utils/url';
import { TransportWebUSB } from '@keystonehq/hw-transport-webusb';
import { URDecoder } from '@ngraveio/bc-ur';
import * as Sentry from '@sentry/browser';
import { Button } from 'antd';
import clsx from 'clsx';
import { WALLET_BRAND_CONTENT, WALLET_BRAND_TYPES } from 'consts';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import QRCodeReader from 'ui/component/QRCodeReader';
import QRCodeCheckerDetail from 'ui/views/QRCodeCheckerDetail';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { useRequest } from 'ahooks';

const KEYSTONE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;

enum ConnectType {
  QRCode = 'qrcode',
  USB = 'usb',
}

const RcLogo = NEXT_KEYRING_ICONS[HARDWARE_KEYRING_TYPES.Ledger.type].rcLight;

export const NewUserImportKeystone = () => {
  const { store, setStore } = useNewUserGuideStore();
  const keystoneErrorCatcher = useKeystoneUSBErrorCatcher();

  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const decoder = useRef(new URDecoder());
  const [errorMessage, setErrorMessage] = useState('');
  const [connectType, setConnectType] = useState<ConnectType>(
    ConnectType.QRCode
  );
  const [scan, setScan] = useState(false);
  const stashKeyringIdRef = useRef<number | null>(null);
  const { search } = useLocation();
  const qs = query2obj(search);
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
    if (!keyringId) {
      return;
    }
    await wallet.requestKeyring(
      KEYSTONE_TYPE,
      'setHDPathType',
      keyringId,
      HDPathType.BIP44
    );
    await wallet.boot(store.password);
    await wallet.unlockHardwareAccount(KEYSTONE_TYPE, [0], keyringId);
    history.push({
      pathname: '/new-user/success',
      search: `?hd=${KEYSTONE_TYPE}&brand=${WALLET_BRAND_TYPES.KEYSTONE}&keyringId=${keyringId}`,
    });
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

  const onConnectViaUSB = async () => {
    try {
      if (!store.password) {
        throw new Error('empty password');
      }

      await TransportWebUSB.requestPermission();

      await wallet.boot(store.password);

      await wallet.requestKeyring(KEYSTONE_TYPE, 'forgetDevice', null);

      const stashKeyringId = await wallet.initQRHardware(
        WALLET_BRAND_TYPES.KEYSTONE
      );

      await wallet.requestKeyring(
        KEYSTONE_TYPE,
        'getAddressesViaUSB',
        stashKeyringId,
        HDPathType.BIP44
      );

      await wallet.requestKeyring(
        KEYSTONE_TYPE,
        'setHDPathType',
        stashKeyringId,
        HDPathType.BIP44
      );

      await wallet.unlockHardwareAccount(KEYSTONE_TYPE, [0], stashKeyringId);

      history.push({
        pathname: '/new-user/success',
        search: `?hd=${KEYSTONE_TYPE}&brand=${WALLET_BRAND_TYPES.KEYSTONE}&keyringId=${stashKeyringId}`,
      });
    } catch (error) {
      console.error(error);
      keystoneErrorCatcher(error);
    }
  };

  const { runAsync: runHandleConnect, loading } = useRequest(onConnectViaUSB, {
    manual: true,
  });

  const handleScan = () => {
    setErrorMessage('');
    setScan(true);
    setProgress(0);
    decoder.current = new URDecoder();
  };

  return (
    <Card
      onBack={() => {
        history.goBack();
      }}
      step={2}
      className="flex flex-col"
    >
      <div className="flex-1 mt-[18px]">
        <header className="mb-[20px]">
          <img
            className="w-[52px] h-[52px] mb-[16px] block mx-auto"
            src={IconKeystone}
          />
          <h1 className="text-r-neutral-title1 text-center text-[24px] font-semibold leading-[29px]">
            {brandInfo.name}
          </h1>
        </header>
        <main>
          <div className="flex justify-center">
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
              className="bg-r-neutral-line p-[2px]"
              itemClassname="text-[13px] leading-[16px] w-[100px] h-[28px]"
              itemClassnameActive="bg-r-neutral-card-1"
              itemClassnameInActive={clsx('text-r-neutral-body')}
            />
          </div>
          {connectType === ConnectType.QRCode ? (
            <div className="mt-[16px] pb-[30px]">
              <p className="text-r-neutral-foot text-[14px] leading-[17px] text-center mb-[20px]">
                Scan the QR code on the Keystone hardware wallet
              </p>
              <div>
                <div
                  className={clsx(
                    'm-auto rounded-[6px] p-[6px] bg-transparent',
                    'w-[200px] h-[200px]',
                    'border border-rabby-neutral-line'
                  )}
                >
                  {scan && (
                    <QRCodeReader
                      width={188}
                      height={188}
                      needAccessRedirect={false}
                      onSuccess={handleScanQRCodeSuccess}
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
            </div>
          ) : (
            <div className="mt-[16px]">
              <p className="text-r-neutral-foot text-[14px] leading-[17px] text-center mb-[20px]">
                Ensure your Keystone 3 Pro is on the homepage
              </p>

              <div className="flex justify-center mb-[30px]">
                <ul
                  className={clsx(
                    'list-decimal list-inside',
                    'text-r-neutral-title1 text-[16px] font-medium leading-[22px] mb-0'
                  )}
                >
                  <li>Plug in your Keystone device</li>
                  <li>Enter your password to unlock</li>
                  <li>Approve the connection to your computer</li>
                </ul>
              </div>
              <img
                src="/images/keystone-plug-1.png"
                className="w-[240px] mx-auto"
              />
              <Button
                onClick={runHandleConnect}
                loading={loading}
                block
                type="primary"
                className={clsx(
                  'mt-[32px] h-[56px] shadow-none rounded-[8px]',
                  'text-[17px] font-medium'
                )}
              >
                Connect Keystone
              </Button>
            </div>
          )}
        </main>
      </div>
    </Card>
  );
};
