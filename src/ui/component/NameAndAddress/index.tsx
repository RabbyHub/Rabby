import React, { useEffect, useState } from 'react';
import ClipboardJS from 'clipboard';
import { message } from 'antd';
import { useWallet, isSameAddress } from 'ui/utils';
import { ContactBookItem } from 'background/service/contactBook';

import IconSuccess from 'ui/assets/success.svg';
import IconAddressCopy from 'ui/assets/address-copy.png';

import './index.less';
import clsx from 'clsx';

interface NameAndAddressProps {
  className?: string;
  address: string;
  nameClass?: string;
  addressClass?: string;
  noNameClass?: string;
}

const NameAndAddress = ({
  className = '',
  address = '',
  nameClass = '',
  addressClass = '',
  noNameClass = '',
}: NameAndAddressProps) => {
  const wallet = useWallet();
  const [contacts, setContacts] = useState<ContactBookItem[]>([]);
  const [alianNames, setAlianNames] = useState({});
  const alianName = alianNames[address.toLowerCase()];
  const addressInContacts = contacts.find((contact) =>
    isSameAddress(contact.address, address)
  );
  const init = async () => {
    const listContacts = await wallet.listContact();
    const alianNames = await wallet.getAllAlianName();
    setContacts(listContacts);
    setAlianNames(alianNames);
  };
  const localName = alianName || addressInContacts?.name || '';
  const handleCopyContractAddress = () => {
    const clipboard = new ClipboardJS('.name-and-address', {
      text: function () {
        return address;
      },
    });

    clipboard.on('success', () => {
      message.success({
        icon: <img src={IconSuccess} className="icon icon-success" />,
        content: 'Copied',
        duration: 0.5,
      });
      clipboard.destroy();
    });
  };
  useEffect(() => {
    init();
  }, [address]);
  return (
    <div className={clsx('name-and-address', className)}>
      {localName && <div className={clsx('name', nameClass)}>{localName}</div>}
      <div
        className={clsx(
          localName ? 'address' : 'name',
          addressClass,
          !localName && noNameClass
        )}
      >
        {localName
          ? `(${address
              ?.toLowerCase()
              .slice(0, 6)}...${address?.toLowerCase().slice(-4)})`
          : `${address
              ?.toLowerCase()
              .slice(0, 6)}...${address?.toLowerCase().slice(-4)}`}
      </div>
      <img
        onClick={handleCopyContractAddress}
        src={IconAddressCopy}
        id={'copyIcon'}
        className={clsx('w-[16px] h-[16px] ml-6', {
          success: true,
        })}
      />
    </div>
  );
};

export default NameAndAddress;
