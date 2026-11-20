import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, PageHeader } from 'ui/component';
import { useWallet } from 'ui/utils';
import { InfoCircleOutlined } from '@ant-design/icons';
import QRCode from 'qrcode.react';
import { Button } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import IconCopy from 'ui/assets/component/icon-copy.svg';
import IconMaskIcon from '@/ui/assets/create-mnemonics/mask-lock.svg';
import { ReactComponent as IconRcMask } from '@/ui/assets/create-mnemonics/mask-lock.svg';
import { cn } from '@/ui/utils/cn';
import {
  backupAlert,
  backupFooter,
  backupHeader,
  backupMask,
  backupPage,
} from './classes';
import { useHideScreenshotContextMenu } from '@/ui/hooks/useScreenshotContextMenuVisible';

const AddressBackupPrivateKey: React.FC<{
  isInModal?: boolean;
  onClose?(): void;
}> = ({ isInModal, onClose }) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const history = useHistory();
  const { state } = useLocation<{
    data: string;
  }>();

  const data = state?.data;
  const [masked, setMasked] = useState(true);
  const [isShowPrivateKey, setIsShowPrivateKey] = useState(false);
  useHideScreenshotContextMenu();

  useEffect(() => {
    if (!data) {
      if (isInModal) {
        onClose?.();
      } else {
        history.goBack();
      }
    }
  }, [data, history, isInModal]);

  if (!data) {
    return null;
  }
  return (
    <div
      className={cn(
        'page-address-backup',
        backupPage,
        isInModal ? 'min-h-0 h-[600px]' : ''
      )}
    >
      <header className={backupHeader}>
        {t('page.backupPrivateKey.title')}
      </header>
      <div className={cn(backupAlert, 'mb-[20px]')}>
        <InfoCircleOutlined />
        {t('page.backupPrivateKey.alert')}
      </div>
      <div className="qrcode relative mx-auto mb-[32px] w-[200px] h-[200px] p-10 rounded-[8px] border-none bg-white">
        <div
          className={cn(backupMask, !masked && 'hidden')}
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
      <div className="private-key relative mb-[24px] h-[80px] p-12 overflow-auto break-words rounded-[6px] bg-r-neutral-card1 text-r-neutral-body font-normal text-14 leading-[20px]">
        {!isShowPrivateKey ? (
          <div
            className="private-key-mask h-full mx-[48px] flex items-center justify-center gap-8 cursor-pointer font-normal text-14 text-center [&_svg]:w-20 [&_svg]:h-20 [&_svg_path]:fill-[var(--r-neutral-body,#D3D8E0)]"
            onClick={() => {
              setIsShowPrivateKey(true);
            }}
          >
            <IconRcMask width={20} height={20} viewBox="0 0 44 44"></IconRcMask>
            {t('page.backupPrivateKey.clickToShow')}
          </div>
        ) : (
          <p className="private-key-text pr-18">{data}</p>
        )}
        <Copy
          icon={IconCopy}
          data={data}
          className="icon-copy absolute right-12 bottom-12 w-16 h-16"
        ></Copy>
      </div>

      <div className={cn(backupFooter, 'pb-[20px]')}>
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

export default AddressBackupPrivateKey;
