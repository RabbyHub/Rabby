import { Popup } from '@/ui/component';
import { CHAINS, CHAINS_ENUM } from '@debank/common';
import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';

export interface Props {
  address: string;
  chainEnum: CHAINS_ENUM;
  onConfirm: () => void;
  onCancel: () => void;
  visible: boolean;
}

export const SelectAddressPopup: React.FC<Props> = ({
  address,
  chainEnum,
  onConfirm,
  onCancel,
  visible,
}) => {
  const { t } = useTranslation();
  const chain = CHAINS[chainEnum];
  return (
    <Popup
      maskClosable
      visible={visible}
      title={t('page.newAddress.coboSafe.findTheAssociatedSafeAddress')}
      height={227}
    >
      <div
        className={clsx(
          'flex items-center gap-8',
          'py-16 px-12',
          'rounded-[6px]',
          'bg-gray-bg',
          'relative'
        )}
      >
        <img className="w-20 h-20" src={chain.logo} alt={chain.name} />
        <span className="text-13">{address}</span>
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
