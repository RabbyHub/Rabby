import React from 'react';
import { AddAddressOptions, BlueHeader } from 'ui/component';
import './style.less';

const NoAddress = () => {
  return (
    <div className="no-address">
      <BlueHeader
        fixed
        showBackIcon={false}
        className="mx-[-20px]"
        fillClassName="mb-[20px]"
      >
        Add an Address
      </BlueHeader>
      <AddAddressOptions />
    </div>
  );
};

export default NoAddress;
