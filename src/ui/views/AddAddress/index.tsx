import React from 'react';
import { AddAddressOptions, BlueHeader } from 'ui/component';
import './style.less';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

const AddAddress: React.FC<{
  isInModal?: boolean;
  onNavigate?(type: string, state?: Record<string, any>): void;
}> = ({ isInModal, onNavigate }) => {
  const { t } = useTranslation();

  return (
    <div
      className={clsx(
        'add-address',
        isInModal ? 'min-h-0 h-[600px] overflow-auto' : ''
      )}
    >
      <BlueHeader
        showBackIcon={!isInModal}
        fixed
        className="mx-[-20px] h-[48px]"
        fillClassName="mb-[20px] h-[48px]"
      >
        {t('page.newAddress.title')}
      </BlueHeader>
      <AddAddressOptions onNavigate={onNavigate} />
    </div>
  );
};

export default AddAddress;
