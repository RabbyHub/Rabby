import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { Button } from 'antd';
import { isValidAddress } from 'ethereumjs-util';
import { useWallet, useWalletRequest } from 'ui/utils';
import clsx from 'clsx';
import { StrayPage } from 'ui/component';
import QrReader from 'react-qr-scanner';

import './style.less';

const ImportHardware = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const wallet = useWallet();
  const [title, setTitle] = useState<string>(t('Scan to add address'));
  const [description, setDescription] = useState<string>(
    t('Please point the QR code in your phone at the screen')
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<string>('');
  const [isValidResult, setIsValidResult] = useState(true);

  const handleScanQRCodeSuccess = (data) => {
    if (data?.text) {
      setTitle(t('Whether to add scanned address'));
      setDescription('');
      setResult(data.text);
      const isValid = isValidAddress(data.text);
      setIsValidResult(isValid);
      if (!isValid) {
        setErrorMsg(t('Not a valid address'));
      }
    }
  };

  const handleScanQRCodeError = (params) => {
    console.log('error', params);
  };

  const handleCancel = () => {
    window.close();
  };

  const [run] = useWalletRequest(wallet.importWatchAddress, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/import/success',
        state: {
          accounts,
          title: t('Successfully created'),
          hasDivider: false,
        },
      });
    },
    onError(e) {
      setIsValidResult(false);
      setErrorMsg(e.message);
    },
  });

  const handleNext = () => {
    run(result);
  };

  return (
    <StrayPage
      header={{
        title: title,
        subTitle: description,
        center: true,
      }}
      headerClassName="mb-40"
      className="qrcode-reader"
    >
      {!result && (
        <div className="qrcode-reader__container">
          <QrReader
            delay={100}
            style={{
              width: '170px',
              height: '170px',
            }}
            onError={handleScanQRCodeError}
            onScan={handleScanQRCodeSuccess}
          />
        </div>
      )}
      {result && (
        <div className="qrcode-reader__result">
          <div className={clsx('item', { invalid: !isValidResult })}>
            {result}
          </div>
          {!isValidResult && <p className="error-message">{errorMsg}</p>}
          <div className="actions">
            <Button onClick={handleCancel} className="w-[222px]" size="large">
              {t('Cancel')}
            </Button>
            <Button
              onClick={handleNext}
              type="primary"
              className="w-[222px]"
              size="large"
              disabled={!isValidResult}
            >
              {t('Next')}
            </Button>
          </div>
        </div>
      )}
    </StrayPage>
  );
};

export default ImportHardware;
