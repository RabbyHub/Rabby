import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import './style.less';
import { InfoCircleOutlined } from '@ant-design/icons';
import QRCode from 'qrcode.react';
import { Button } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconMaskIcon from '@/ui/assets/create-mnemonics/mask-lock.svg';
import { ReactComponent as IconRcMask } from '@/ui/assets/create-mnemonics/mask-lock.svg';
import clsx from 'clsx';

const AddressBackup = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const history = useHistory();
  const { state } = useLocation<{
    data: string;
  }>();
  const data = state?.data;
  const [masked, setMasked] = useState(true);
  const [isShowPrivateKey, setIsShowPrivateKey] = useState(false);

  useEffect(() => {
    if (!data) {
      history.goBack();
    }
  }, [data, history]);
  if (!data) {
    return null;
  }
  return (
    <div className="page-address-backup">
      <header>{t('page.backupPrivateKey.title')}</header>
      <div className="alert mb-[20px]">
        <InfoCircleOutlined />
        {t('page.backupPrivateKey.alert')}
      </div>
      <div className="qrcode mb-[32px] relative">
        <div
          className={clsx('mask', !masked && 'hidden')}
          onClick={() => {
            setMasked(false);
          }}
        >
          <img src={IconMaskIcon} className="w-[44px] h-[44px]" />
          <p className="mt-[16px] mb-0 text-white px-[15px]">
            {t('page.backupPrivateKey.clickToShowQr')}
          </p>
        </div>
        <QRCode
          value={data}
          size={180}
          style={masked ? { filter: 'blur(3px)' } : {}}
        ></QRCode>
      </div>
      <div className="private-key mb-[24px]">
        {!isShowPrivateKey ? (
          <div
            className="private-key-mask"
            onClick={() => {
              setIsShowPrivateKey(true);
            }}
          >
            <IconRcMask width={20} height={20} viewBox="0 0 44 44"></IconRcMask>
            {t('page.backupPrivateKey.clickToShow')}
          </div>
        ) : (
          <>
            {data}
            <Copy icon={IconCopy} data={data} className="icon-copy"></Copy>
          </>
        )}
      </div>

      <div className="footer pb-[20px]">
        <Button
          type="primary"
          size="large"
          className="w-full"
          onClick={() => history.goBack()}
        >
          {t('global.Done')}
        </Button>
      </div>
    </div>
  );
};

export default AddressBackup;
