import React from 'react';
import { useHistory } from 'react-router-dom';
import { message } from 'antd';
import { useWallet } from 'ui/utils';
import Field from '../Field';
import IconNewAddress from 'ui/assets/create.svg';
import IconImportAddress from 'ui/assets/import.svg';
import IconConnectHardware from 'ui/assets/connect-hardware.svg';
import IconWatchAddress from 'ui/assets/watch-address.svg';
import IconArrowRight from 'ui/assets/arrow-right-gray.svg';
import IconSuccess from 'ui/assets/success.svg';
import './style.less';

const AddAddressOptions = () => {
  const history = useHistory();
  const wallet = useWallet();

  const renderData = [
    {
      leftIcon: IconNewAddress,
      content: 'Create',
      onClick: async () => {
        if (wallet.checkHasMnemonic()) {
          await wallet.deriveNewAccountFromMnemonic();
          message.success({
            icon: <img src={IconSuccess} className="icon icon-success" />,
            content: 'Created successfully',
          });

          history.push('/dashboard');
        } else {
          history.push('/create-mnemonics');
        }
      },
    },
    {
      leftIcon: IconImportAddress,
      content: 'Import',
      onClick: () => history.push('/import'),
    },
    {
      leftIcon: IconConnectHardware,
      content: 'Harware Wallet',
      onClick: () => {
        wallet.openIndexPage('/import/hardware');
      },
    },
    {
      leftIcon: IconWatchAddress,
      content: 'Watch Mode',
      onClick: () => history.push('/import/watch-address'),
    },
  ];
  return (
    <div className="add-address-options">
      {renderData.map((data) => (
        <Field
          key={data.content}
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
