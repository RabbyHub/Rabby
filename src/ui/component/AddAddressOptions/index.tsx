import React from 'react';
import { useHistory } from 'react-router-dom';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  const renderData = [
    {
      leftIcon: IconNewAddress,
      content: t('createAddress'),
      onClick: async () => {
        if (wallet.checkHasMnemonic()) {
          await wallet.deriveNewAccountFromMnemonic();
          message.success({
            icon: <img src={IconSuccess} className="icon icon-success" />,
            content: t('Successfully created'),
          });

          history.push('/dashboard');
        } else {
          history.push('/create-mnemonics');
        }
      },
    },
    {
      leftIcon: IconImportAddress,
      content: t('Import'),
      onClick: () => history.push('/import'),
    },
    {
      leftIcon: IconConnectHardware,
      content: t('Harware Wallet'),
      onClick: () => {
        wallet.openIndexPage('/import/hardware');
      },
    },
    {
      leftIcon: IconWatchAddress,
      content: t('Watch Mode'),
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
