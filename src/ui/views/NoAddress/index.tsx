import React from 'react';
import { Link } from 'react-router-dom';
import { AddAddressOptions } from 'ui/component';
import IconSetting from 'ui/assets/settings.svg';
import './style.less';

const NoAddress = () => {
  return (
    <div className="no-address bg-gray-bg h-full">
      <div className="h-[100px] header px-28">
        <div className="flex justify-between mb-4">
          <div className="text-15 text-white">No Address</div>
          <Link to="/settings">
            <img className="icon icon-settings" src={IconSetting} />
          </Link>
        </div>
        <div className="text-12 text-white opacity-60">
          Please add your address via one of the following methods
        </div>
      </div>
      <div className="pt-[87px] px-28">
        <AddAddressOptions />
      </div>
    </div>
  );
};

export default NoAddress;
