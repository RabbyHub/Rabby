import React from 'react';
import { AddAddressOptions, BlueHeader } from 'ui/component';
import './style.less';
import { useTranslation } from 'react-i18next';

const NoAddress = () => {
  const { t } = useTranslation();

  return (
    <div className="no-address">
      <BlueHeader
        fixed
        showBackIcon={false}
        className="mx-[-20px]"
        fillClassName="mb-[20px]"
      >
        {t('page.newAddress.title')}
      </BlueHeader>
      <AddAddressOptions />
    </div>
  );
};

export default NoAddress;
