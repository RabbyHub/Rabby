import React from 'react';
import { AddAddressOptions, BlueHeader } from 'ui/component';
import './style.less';

const AddAddress = () => {
  return (
    <div className="add-address">
      <BlueHeader fixed className="mx-[-20px]" fillClassName="mb-[20px]">
        Add an Address
      </BlueHeader>
      <AddAddressOptions />
    </div>
  );
};

export default AddAddress;
