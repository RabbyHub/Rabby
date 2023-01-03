import React from 'react';
import { Account, AccountList, Props as AccountListProps } from './AccountList';
import { SettingData } from './AdvancedSettings';

interface Props extends AccountListProps, SettingData {
  currentAccounts: Account[];
}

export const AddressesInRabby: React.FC<Props> = ({
  currentAccounts,
  ...props
}) => {
  return <AccountList data={currentAccounts} {...props}></AccountList>;
};
