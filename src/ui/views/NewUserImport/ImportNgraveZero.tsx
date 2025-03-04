import {
  HARDWARE_KEYRING_TYPES,
  WALLET_BRAND_CONTENT,
  WALLET_BRAND_TYPES,
} from '@/constant';
import IconNgraveZero from '@/ui/assets/walletlogo/ngrave.svg';
import { Card } from '@/ui/component/NewUserImport';
import Progress from '@/ui/component/Progress';
import { useWallet } from '@/ui/utils';
import { URDecoder } from '@ngraveio/bc-ur';
import * as Sentry from '@sentry/browser';
import clsx from 'clsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import QRCodeReader from 'ui/component/QRCodeReader';
import QRCodeCheckerDetail from 'ui/views/QRCodeCheckerDetail';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { useMount } from 'ahooks';

const NGRAVEZERO_TYPE = HARDWARE_KEYRING_TYPES.NGRAVEZERO.type;

export const NewUserImportNgraveZero = () => {
  const { store, setStore } = useNewUserGuideStore();

  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const decoder = useRef(new URDecoder());
  const [errorMessage, setErrorMessage] = useState('');
  const [scan, setScan] = useState(false);
  const stashKeyringIdRef = useRef<number | null>(null);
  const { search } = useLocation();
  const brandInfo = WALLET_BRAND_CONTENT['NGRAVE ZERO'];

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
    history.push({
      pathname: '/new-user/import/select-address',
      search: `?hd=${NGRAVEZERO_TYPE}&brand=${WALLET_BRAND_TYPES.NGRAVEZERO}&keyringId=${keyringId}&isLazyImport=true&isNewUserImport=true`,
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
      .initQRHardware(WALLET_BRAND_TYPES.NGRAVEZERO)
      .then((stashKeyringId) => {
        stashKeyringIdRef.current = stashKeyringId;
        wallet
          .requestKeyring(NGRAVEZERO_TYPE, 'isReady', stashKeyringId)
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
            src={IconNgraveZero}
          />
          <h1 className="text-r-neutral-title1 text-center text-[24px] font-semibold leading-[29px]">
            {brandInfo.name}
          </h1>
        </header>
        <main>
          <div className="mt-[16px] pb-[30px]">
            <p className="text-r-neutral-foot text-[14px] leading-[17px] text-center mb-[20px]">
              {t('page.newUserImport.importNgraveZero.qrcode.desc')}
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
        </main>
      </div>
    </Card>
  );
};
