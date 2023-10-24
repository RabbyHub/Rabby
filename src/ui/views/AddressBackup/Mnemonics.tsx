import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './style.less';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import IconMaskIcon from '@/ui/assets/create-mnemonics/mask-lock.svg';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconSuccess from 'ui/assets/success.svg';
import { message } from 'antd';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import clsx from 'clsx';
import WordsMatrix from '@/ui/component/WordsMatrix';
import { useNavigate, useLocation } from 'react-router-dom';
import IconBack from 'ui/assets/back.svg';

const AddressBackup = () => {
  const { t } = useTranslation();

  const navigate = useNavigate();
  const { state } = useLocation();

  const data = state?.data;
  const [masked, setMasked] = useState(true);

  const onCopyMnemonics = React.useCallback(() => {
    copyTextToClipboard(data).then(() => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: t('global.copied'),
        duration: 0.5,
      });
    });
  }, [data]);

  useEffect(() => {
    if (!data) {
      navigate(-1);
    }
  }, [data, navigate]);

  if (!data) {
    return null;
  }

  return (
    <div className="page-address-backup">
      <header className="relative">
        {!!state.goBack && (
          <img
            src={IconBack}
            className={clsx('absolute icon icon-back filter invert')}
            onClick={() => navigate(-1)}
          />
        )}
        {t('page.backupSeedPhrase.title')}
      </header>
      <div className="alert mb-[34px]">
        <InfoCircleOutlined />
        {t('page.backupSeedPhrase.alert')}
      </div>
      <div className="mb-[74px]">
        <div className="relative">
          <div
            onClick={() => setMasked(false)}
            className={clsx('mask', !masked && 'hidden')}
          >
            <img src={IconMaskIcon} className="w-[44px] h-[44px]" />
            <p className="mt-[16px] mb-0 text-white">
              {t('page.backupSeedPhrase.clickToShow')}
            </p>
          </div>
          <div
            className="rounded-[6px] flex items-center w-full"
            style={masked ? { filter: 'blur(3px)' } : {}}
          >
            <WordsMatrix
              className="w-full"
              focusable={false}
              closable={false}
              words={data.split(' ')}
            />
          </div>
        </div>
        <div
          onClick={onCopyMnemonics}
          className={clsx('copy', masked ? 'invisible' : 'visible')}
        >
          <img src={IconCopy} />
          {t('page.backupSeedPhrase.copySeedPhrase')}
        </div>
      </div>
      <div className="footer pb-[24px]">
        <Button
          type="primary"
          size="large"
          className="w-[200px]"
          onClick={() => navigate(-1)}
        >
          {t('global.Done')}
        </Button>
      </div>
    </div>
  );
};

export default AddressBackup;
