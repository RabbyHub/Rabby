import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader, AddAddressOptions } from 'ui/component';
import './style.less';

const AddAddress = () => {
  const { t } = useTranslation();
  return (
    <div className="add-address">
      <PageHeader>{t('Add address')}</PageHeader>
      <AddAddressOptions />
    </div>
  );
};

export default AddAddress;
