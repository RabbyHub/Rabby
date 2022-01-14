import React from 'react';
import { message } from 'antd';
import IconSuccess from 'ui/assets/success.svg';
import IconAddressCopy from 'ui/assets/address-copy.png';

import './index.less';
import clsx from 'clsx';

interface NameAndAddress {
  className?: string;
  name?: string;
  address: string;
  nameClass?: string;
  addressClass?: string;
  noNameClass?: string;
}

const NameAndAddress = ({
  className = '',
  name = '',
  address = '',
  nameClass = '',
  addressClass = '',
  noNameClass = '',
}: NameAndAddress) => (
  <div className={clsx('name-and-address', className)}>
    {name && <div className={clsx('name', nameClass)}>{name}</div>}
    <div
      className={clsx(
        name ? 'address' : 'name',
        addressClass,
        !name && noNameClass
      )}
    >
      {name
        ? `(${address
            ?.toLowerCase()
            .slice(0, 6)}...${address?.toLowerCase().slice(-4)})`
        : `${address
            ?.toLowerCase()
            .slice(0, 6)}...${address?.toLowerCase().slice(-4)}`}
    </div>
    <img
      onClick={(e) => {
        e.stopPropagation;
        navigator.clipboard.writeText(address);
        message.success({
          icon: <img src={IconSuccess} className="icon icon-success" />,
          content: 'Copied',
          duration: 0.5,
        });
      }}
      src={IconAddressCopy}
      id={'copyIcon'}
      className={clsx('w-[16px] h-[16px] ml-6', {
        success: true,
      })}
    />
  </div>
);

export default NameAndAddress;
