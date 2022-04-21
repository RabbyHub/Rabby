import React from 'react';
import { useTranslation } from 'react-i18next';
import { AddAddressOptions } from 'ui/component';
import './style.less';

const NoAddress = () => {
  const { t } = useTranslation();
  return (
    <div className="no-address bg-gray-bg">
      <div className="h-[60px] header top-0">
        <div className="flex justify-between mb-4 items-center rabby-container px-[20px]">
          <div className="text-20 text-white">{t('Please add an address')}</div>
        </div>
      </div>
      <div className="options mt-[60px] rabby-container">
        <AddAddressOptions />
      </div>
    </div>
  );
};

export default NoAddress;
