import React from 'react';
import { AccountList, Props as AccountListProps } from './AccountList';
import { SettingData } from './AdvancedSettings';

interface Props extends AccountListProps, SettingData {}

export const AddressesInRabby: React.FC<Props> = ({ ...props }) => {
  return <AccountList {...props}></AccountList>;
};
