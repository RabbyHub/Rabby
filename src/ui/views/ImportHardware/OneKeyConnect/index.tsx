import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { URDecoder } from '@ngraveio/bc-ur';
import QRCodeReader from 'ui/component/QRCodeReader';
import { useWallet } from 'ui/utils';
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
import { query2obj } from '@/ui/utils/url';
import { findEthAccountByMultiAccounts } from './utils';
import { StrayPageWithButton } from 'ui/component';

const KEYSTONE_TYPE = HARDWARE_KEYRING_TYPES.Keystone.type;
const BRAND_TYPES = WALLET_BRAND_TYPES.ONEKEY;

enum ConnectType {
  QRCode = 'qrcode',
  USB = 'usb',
}

export const OneKeyConnect = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [form] = Form.useForm();
  const decoder = useRef(new URDecoder());
  const [errorMessage, setErrorMessage] = useState('');
  const [connectType, setConnectType] = useState<ConnectType>(ConnectType.USB);
  const [scan, setScan] = useState(false);
  const stashKeyringIdRef = useRef<number | null>(null);
  const { search } = useLocation();
  const qs = query2obj(search);
  const isReconnect = !!qs.reconnect;
  const brandInfo = WALLET_BRAND_CONTENT.ONEKEY;

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
    let search = `?hd=${KEYSTONE_TYPE}&brand=${BRAND_TYPES}`;
    if (keyringId) {
      search += `&keyringId=${keyringId}`;
    }

    history.push({
      pathname: '/import/select-address',
      state: {
        keyring: KEYSTONE_TYPE,
        keyringId,
        brand: BRAND_TYPES,
      },
      search,
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
    wallet.initQRHardware(BRAND_TYPES).then((stashKeyringId) => {
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
      search: isReconnect ? '?type=onekey&reconnect=1' : '?type=onekey',
    });
  };

  const handleScan = () => {
    setErrorMessage('');
    setScan(true);
    setProgress(0);
    decoder.current = new URDecoder();
  };
  return (
    <StrayPageWithButton
      className="stray-page-wide onekey-page"
      backgroundClassName="bg-r-neutral-card2"
      onSubmit={connectType === ConnectType.USB ? onConnectViaUSB : undefined}
      hasBack={false}
      footerFixed={false}
      hideNextButton={connectType === ConnectType.QRCode}
    >
      <main>
        <div className="mb-[10px]">
          <img className="w-[68px] h-[68px] mx-auto" src={brandInfo.image} />
        </div>
        <div className="font-medium text-r-neutral-body text-center">
          <h1 className="text-[24px] leading-[33px] text-r-neutral-title1">
            {brandInfo.name}
          </h1>
          <PillsSwitch
            value={connectType}
            options={
              [
                {
                  key: ConnectType.USB,
                  label: 'USB',
                },
                {
                  key: ConnectType.QRCode,
                  label: 'QR Code',
                },
              ] as const
            }
            onTabChange={setConnectType}
            className="bg-r-neutral-line mt-[30px] mb-[8px]"
            itemClassname="text-[15px] w-[148px] h-[40px]"
            itemClassnameActive="bg-r-neutral-bg-1"
            itemClassnameInActive={clsx('text-r-neutral-body')}
          />
          {connectType === ConnectType.QRCode ? (
            <p className="text-15 opacity-80 mt-16">
              {t('page.newUserImport.importOneKey.qrcode.desc')}
            </p>
          ) : null}
        </div>
        {connectType === ConnectType.QRCode ? (
          <div className="mt-[24px]">
            <div className="relative flex justify-center">
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
                    needAccessRedirect={false}
                    onSuccess={handleScanQRCodeSuccess}
                    className="bg-r-neutral-line"
                  />
                )}
              </div>
              <ImageCarousel images={CAROUSEL_IMAGES} />
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
          <div className="connect-onekey mt-[6px]">
            <p className="text-r-neutral-title1 text-14 leading-[20px] mb-[20px]">
              {t('page.newUserImport.importOneKey.title')}
            </p>
            <ul className="w-[240px] pl-[20px] m-auto text-r-neutral-title1 text-14 leading-[20px] mb-[35px]">
              <li>{t('page.newUserImport.importOneKey.tip1')}</li>
              <li>{t('page.newUserImport.importOneKey.tip2')}</li>
            </ul>
            <img src="/images/onekey-usb-connect.png" className="onekey-plug" />
          </div>
        )}
      </main>
    </StrayPageWithButton>
  );
};

const CAROUSEL_IMAGES = [
  '/images/onekey-usb-connect-step1.png',
  '/images/onekey-usb-connect-step2.png',
  '/images/onekey-usb-connect-step3.png',
];

interface ImageCarouselProps {
  images: string[];
  className?: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, className }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [images.length]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        handleDragEnd(e.clientX);
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (isDragging) {
        handleDragEnd(e.changedTouches[0].clientX);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove);
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, startX]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const handleDragStart = (clientX: number) => {
    setStartX(clientX);
    setIsDragging(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleDragEnd = (clientX: number) => {
    if (!isDragging) return;

    const diff = startX - clientX;
    if (Math.abs(diff) > 20) {
      if (diff > 0) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }

    setIsDragging(false);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000);
  };

  return (
    <div className={clsx('onekey-carousel', className)}>
      <div className="absolute">
        <img src="images/onekey-usb-connect-background.svg" />
      </div>
      <div
        className="onekey-carousel-bubble"
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      >
        <div className="onekey-carousel-content">
          {images.map((image, index) => (
            <div
              key={index}
              className={clsx(
                'onekey-carousel-slide',
                `onekey-carousel-slide-${index + 1}`,
                {
                  active: index === currentIndex,
                  prev: index < currentIndex,
                  next: index > currentIndex,
                }
              )}
            >
              <img
                src={image}
                alt={`OneKey step ${index + 1}`}
                draggable={false}
              />
            </div>
          ))}
        </div>
        <div className="onekey-carousel-dots">
          {images.map((_, index) => (
            <div
              key={index}
              className={clsx('onekey-carousel-dot', {
                active: index === currentIndex,
              })}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
