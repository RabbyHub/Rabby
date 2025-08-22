import { HARDWARE_KEYRING_TYPES, WALLET_BRAND_TYPES } from '@/constant';
import OneKeySVG from '@/ui/assets/walletlogo/onekey.svg';
import { Card } from '@/ui/component/NewUserImport';
import PillsSwitch from '@/ui/component/PillsSwitch';
import Progress from '@/ui/component/Progress';
import { useWallet } from '@/ui/utils';
import { LedgerHDPathType as HDPathType } from '@/ui/utils/ledger';
import { URDecoder } from '@ngraveio/bc-ur';
import * as Sentry from '@sentry/browser';
import { Button } from 'antd';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import QRCodeReader from 'ui/component/QRCodeReader';
import QRCodeCheckerDetail from 'ui/views/QRCodeCheckerDetail';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { useMount } from 'ahooks';
import { findEthAccountByMultiAccounts } from '../ImportHardware/OneKeyConnect/utils';
import { ImageCarousel } from '../ImportHardware/OneKeyConnect/ImageCarousel';
import { useHDWalletUnlockAndRedirect } from './hooks/useHardWareUnlockAddress';
import { useAsyncFn } from 'react-use';
import { getOneKeyFirstOneKeyDevice } from '@/ui/utils/onekey';

const KEYSTONE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;

enum ConnectType {
  QRCode = 'qrcode',
  USB = 'usb',
}

const LOGO_MAP = {
  [WALLET_BRAND_TYPES.ONEKEY]: OneKeySVG,
};

export const NewUserImportOneKey = () => {
  const { store, setStore } = useNewUserGuideStore();

  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const decoder = useRef(new URDecoder());
  const [errorMessage, setErrorMessage] = useState('');
  const [connectType, setConnectType] = useState<ConnectType>(ConnectType.USB);
  const [scan, setScan] = useState(false);
  const stashKeyringIdRef = useRef<number | null>(null);
  const brand = WALLET_BRAND_TYPES.ONEKEY;

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
        } else if (result.type === 'crypto-multi-accounts') {
          const ethAccount = findEthAccountByMultiAccounts(result);

          if (!ethAccount) {
            setErrorMessage(
              t(
                'Not found the account in the QR code. Please scan the sync QR code of the hardware wallet.'
              )
            );
            return;
          }

          stashKeyringIdRef.current = await wallet.submitQRHardwareCryptoHDKey(
            ethAccount.cbor.toString('hex'),
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
      search: `?hd=${KEYSTONE_TYPE}&brand=${brand}&keyringId=${keyringId}`,
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

  useEffect(() => {
    // init onekey sdk
    wallet.requestKeyring(
      HARDWARE_KEYRING_TYPES.Onekey.type,
      'searchDevices',
      null
    );
  }, []);

  const handle = useHDWalletUnlockAndRedirect(
    HARDWARE_KEYRING_TYPES.Onekey.type
  );

  const onConnectViaUSB = async () => {
    try {
      if (!store.password) {
        throw new Error('empty password');
      }
      await getOneKeyFirstOneKeyDevice();
      await wallet.authorizeOneKeyHIDPermission();
      await handle();
    } catch (error) {
      console.error(error);
    }
  };

  const [{ loading }, runHandleConnect] = useAsyncFn(onConnectViaUSB, [
    onConnectViaUSB,
  ]);

  const handleScan = () => {
    setErrorMessage('');
    setScan(true);
    setProgress(0);
    decoder.current = new URDecoder();
  };

  useMount(async () => {
    if (!store.password) {
      history.replace('/new-user/guide');
    }
  });

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
            src={LOGO_MAP[brand]}
          />
          <h1 className="text-r-neutral-title1 text-center text-[24px] font-semibold leading-[29px]">
            OneKey
          </h1>
        </header>
        <main>
          <div className="flex justify-center">
            <PillsSwitch
              value={connectType}
              options={[
                {
                  key: ConnectType.USB,
                  label: 'USB',
                },
                {
                  key: ConnectType.QRCode,
                  label: 'QR Code',
                },
              ]}
              onTabChange={setConnectType}
              className="bg-r-neutral-line p-[2px]"
              itemClassname="text-[13px] leading-[16px] w-[100px] h-[28px]"
              itemClassnameActive="bg-r-neutral-card-1"
              itemClassnameInActive={clsx('text-r-neutral-body')}
            />
          </div>
          {connectType === ConnectType.USB ? (
            <div className="mt-[16px]">
              <p className="text-r-neutral-foot text-[14px] leading-[17px] text-center mb-[20px]">
                {t('page.newUserImport.importOneKey.title')}
              </p>

              <div className="flex justify-center mb-[30px]">
                <ul
                  className={clsx(
                    'list-inside',
                    'text-r-neutral-title1 text-[16px] font-medium leading-[22px] mb-0'
                  )}
                >
                  <li>{t('page.newUserImport.importOneKey.tip1')}</li>
                  <li>{t('page.newUserImport.importOneKey.tip2')}</li>
                  <li>{t('page.newUserImport.importOneKey.tip3')}</li>
                </ul>
              </div>
              <img
                src="/images/onekey-usb-connect.png"
                className="w-[200px] mx-auto"
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
                {t('page.newUserImport.importOneKey.connect')}
              </Button>
            </div>
          ) : (
            <div className="mt-[16px] pb-[30px]">
              <p className="text-r-neutral-foot text-[14px] leading-[17px] text-center mb-[20px]">
                {t('page.newUserImport.importOneKey.qrcode.desc', {
                  brandName: brand,
                })}
              </p>
              <div>
                <div className="relative flex justify-center">
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
                  <ImageCarousel />
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
          )}
        </main>
      </div>
    </Card>
  );
};
