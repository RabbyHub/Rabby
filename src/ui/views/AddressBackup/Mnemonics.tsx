import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWallet } from 'ui/utils';
import './style.less';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import IconMaskIcon from '@/ui/assets/create-mnemonics/mask-lock.svg';
import { ReactComponent as RcIconCopyCC } from 'ui/assets/component/icon-copy-cc.svg';
import IconSuccess from 'ui/assets/success.svg';
import { message } from 'antd';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import clsx from 'clsx';
import WordsMatrix from '@/ui/component/WordsMatrix';
import { useHistory, useLocation } from 'react-router-dom';
import IconBack from 'ui/assets/back.svg';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { Slip39TextareaContainer } from './Slip39TextAreaContainer';
import { Popup } from '@/ui/component';
import QRCode from 'qrcode.react';
import { ReactComponent as RcIconQrCode } from 'ui/assets/qrcode-cc.svg';

const AddressBackup = () => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const history = useHistory();
  const { state } = useLocation<{
    data: string;
    goBack?: boolean;
  }>();

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

  const handleShowQrCode = () => {
    Popup.open({
      title: t('page.backupSeedPhrase.qrCodePopupTitle'),
      height: 476,
      closable: true,
      content: (
        <div>
          <div className="flex items-start gap-8 px-[12px] py-[10px] rounded-[4px] bg-r-red-light text-r-red-default mb-[20px]">
            <InfoCircleOutlined className="rotate-180" />
            <div className="text-[14px] leading-[18px] ">
              {t('page.backupSeedPhrase.qrCodePopupTips')}
            </div>
          </div>
          <div className="flex justify-center">
            <div className="p-[12px] rounded-[16px] border-rabby-neutral-line border-[1px] bg-r-neutral-card-1">
              <QRCode value={data} size={240} />
            </div>
          </div>
        </div>
      ),
    });
  };

  const isSlip39 = React.useMemo(() => {
    return data.split('\n').length > 1;
  }, [data]);

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
      <header className="relative">
        {!!state.goBack && (
          <img
            src={IconBack}
            className={clsx('absolute icon icon-back filter invert')}
            onClick={() => history.goBack()}
          />
        )}
        {t('page.backupSeedPhrase.title')}
      </header>
      <div className="alert mb-[34px]">
        <InfoCircleOutlined className="rotate-180" />
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
            {isSlip39 ? (
              <Slip39TextareaContainer data={data} />
            ) : (
              <WordsMatrix
                className="w-full bg-r-neutral-card1"
                focusable={false}
                closable={false}
                words={data.split(' ')}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-[24px] justify-center">
          <div
            onClick={handleShowQrCode}
            className={clsx(
              'copy text-r-neutral-foot',
              masked ? 'invisible' : 'visible'
            )}
          >
            <ThemeIcon
              src={RcIconQrCode}
              className="text-r-neutral-foot w-[16px] h-[16px]"
            />
            {t('page.backupSeedPhrase.showQrCode')}
          </div>
          <div
            onClick={onCopyMnemonics}
            className={clsx(
              'copy text-r-neutral-foot',
              masked ? 'invisible' : 'visible'
            )}
          >
            <ThemeIcon
              src={RcIconCopyCC}
              className="text-r-neutral-foot w-[16px] h-[16px]"
            />
            {t('page.backupSeedPhrase.copySeedPhrase')}
          </div>
        </div>
      </div>
      <div className="footer pb-[20px]">
        <Button
          type="primary"
          className="w-full"
          size="large"
          onClick={() => history.goBack()}
        >
          {t('global.Done')}
        </Button>
      </div>
    </div>
  );
};

export default AddressBackup;
