import React from 'react';
import './index.less';
import clsx from 'clsx';

interface NameAndAddress {
  className?: string;
  name?: string;
  address: string;
  nameClass?: string;
  addressClass?: string;
}

const NameAndAddress = ({
  className = '',
  name = '',
  address = '',
  nameClass = '',
  addressClass = '',
}: NameAndAddress) => (
  <div className={clsx('name-and-address', className)}>
    {name && <div className={clsx('name', nameClass)}>{name}</div>}
    <div className={clsx(name ? 'address' : 'name', addressClass)}>
      {name
        ? `(${address
            ?.toLowerCase()
            .slice(0, 6)}...${address?.toLowerCase().slice(-4)})`
        : `${address
            ?.toLowerCase()
            .slice(0, 6)}...${address?.toLowerCase().slice(-4)}`}
    </div>
  </div>
);

export default NameAndAddress;
