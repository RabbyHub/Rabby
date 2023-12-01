import { Popup } from '@/ui/component';
import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import IconGnosis from 'ui/assets/walletlogo/safe.svg';

export interface Props {
  address: string;
  onConfirm: () => void;
  onCancel: () => void;
  visible: boolean;
}

export const SelectAddressPopup: React.FC<Props> = ({
  address,
  onConfirm,
  onCancel,
  visible,
}) => {
  const { t } = useTranslation();
  return (
    <Popup
      maskClosable
      visible={visible}
      title={t('page.newAddress.coboSafe.findTheAssociatedSafeAddress')}
      height={227}
      isSupportDarkMode
    >
      <div
        className={clsx(
          'flex items-center gap-8',
          'py-16 px-12',
          'rounded-[6px]',
          'bg-r-neutral-card-2 text-r-neutral-body',
          'relative'
        )}
      >
        <img className="w-20 h-20" src={IconGnosis} />
        <span className="text-12">{address}</span>
      </div>
      <footer
        className={clsx(
          'flex items-center justify-between',
          'absolute bottom-20 left-20 right-20'
        )}
      >
        <Button
          className="w-[172px] h-[44px]"
          onClick={onCancel}
          type="primary"
        >
          {t('global.Cancel')}
        </Button>
        <Button
          className="w-[172px] h-[44px]"
          onClick={onConfirm}
          type="primary"
        >
          {t('page.newAddress.coboSafe.import')}
        </Button>
      </footer>
    </Popup>
  );
};
