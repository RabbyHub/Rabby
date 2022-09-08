import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { Button } from 'antd';
import { isValidAddress } from 'ethereumjs-util';
import { useWallet, useWalletRequest } from 'ui/utils';
import clsx from 'clsx';
import { StrayPage } from 'ui/component';
import QRCodeReader from 'ui/component/QRCodeReader';

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

  const handleScanQRCodeSuccess = (data: string) => {
    setTitle(t('Whether to add scanned address'));
    setDescription('');
    setResult(data);
    const isValid = isValidAddress(data);
    setIsValidResult(isValid);
    if (!isValid) {
      setErrorMsg(t('Not a valid address'));
    }
  };

  const handleCancel = () => {
    window.close();
  };

  const [run] = useWalletRequest(wallet.importWatchAddress, {
    onSuccess(accounts) {
      history.replace({
        pathname: '/popup/import/success',
        state: {
          accounts,
          title: t('Imported Successfully'),
          hasDivider: false,
          editing: true,
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
          <QRCodeReader
            onSuccess={handleScanQRCodeSuccess}
            width={170}
            height={170}
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
