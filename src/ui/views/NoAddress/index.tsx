import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AddAddressOptions } from 'ui/component';
import IconSetting from 'ui/assets/settings.svg';
import './style.less';

const NoAddress = () => {
  const { t } = useTranslation();
  return (
    <div className="no-address bg-gray-bg">
      <div className="h-[60px] header px-24">
        <div className="flex justify-between mb-4">
          <div className="text-20 text-white">{t('No Address')}</div>
          <Link to="/settings">
            <img className="icon icon-settings" src={IconSetting} />
          </Link>
        </div>
      </div>
      <div className="options">
        <AddAddressOptions />
      </div>
    </div>
  );
};

export default NoAddress;
