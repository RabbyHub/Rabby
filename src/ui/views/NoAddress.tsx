import React from 'react';
import { Link } from 'react-router-dom';
import { AddAddressOptions } from 'ui/component';
import IconSetting from 'ui/assets/settings.svg';

const NoAddress = () => {
  return (
    <div className="bg-gray-bg h-full">
      <div className="h-[100px] header bg-gradient-to-r from-blue-from to-blue-to pt-20 px-28">
        <div className="flex justify-between mb-14">
          <div className="text-15 text-white">No Address</div>
          <Link to="/settings">
            <img className="icon icon-settings" src={IconSetting} />
          </Link>
        </div>
        <div className="text-12 text-white opacity-60">
          No available addresses
        </div>
        <div className="text-12 text-white opacity-60">
          Please add your address via one of the following methods
        </div>
      </div>
      <div className="pt-40 px-28">
        <AddAddressOptions />
      </div>
    </div>
  );
};

export default NoAddress;
