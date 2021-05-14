import React from 'react';
import { useHistory } from 'react-router-dom';
import Field from '../Field';
import IconNewAddress from 'ui/assets/create.svg';
import IconImportAddress from 'ui/assets/import.svg';
import IconConnectHardware from 'ui/assets/connect-hardware.svg';
import IconWatchAddress from 'ui/assets/watch-address.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import './style.less';

const AddAddressOptions = () => {
  const history = useHistory();
  const renderData = [
    {
      leftIcon: IconNewAddress,
      content: 'Create a new address',
      onClick: () => history.push('/create'),
    },
    {
      leftIcon: IconImportAddress,
      content: 'Import an address',
      onClick: () => history.push('/import'),
    },
    {
      leftIcon: IconConnectHardware,
      content: 'Connect a hardware wallet',
      onClick: () => history.push('/import/hardware'),
    },
    {
      leftIcon: IconWatchAddress,
      content: 'Add awatch address',
      onClick: () => history.push('/'),
    },
  ];
  return (
    <div className="add-address-options">
      {renderData.map((data) => (
        <Field
          leftIcon={<img src={data.leftIcon} className="icon" />}
          rightIcon={
            <img src={IconArrowRight} className="icon icon-arrow-right" />
          }
          onClick={data.onClick}
        >
          {data.content}
        </Field>
      ))}
    </div>
  );
};

export default AddAddressOptions;
