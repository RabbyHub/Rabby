import React from 'react';
import { AccountList, Props } from './AccountList';

export const AddressesInRabby: React.FC<Props> = (props) => {
  return <AccountList {...props}></AccountList>;
};
