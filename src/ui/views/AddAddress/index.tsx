import React from 'react';
import { PageHeader, AddAddressOptions } from 'ui/component';
import './style.less';

const AddAddress = () => {
  return (
    <div className="add-address">
      <PageHeader>Add address</PageHeader>
      <AddAddressOptions />
    </div>
  );
};

export default AddAddress;
