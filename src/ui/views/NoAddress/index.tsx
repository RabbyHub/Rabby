import React from 'react';
import { AddAddressOptions, BlueHeader } from 'ui/component';
import { useTranslation } from 'react-i18next';

const NoAddress = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-[100vh] bg-r-neutral-bg-2 px-20 pb-[30px]">
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
