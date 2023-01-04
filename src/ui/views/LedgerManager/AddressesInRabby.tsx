import React from 'react';
import { AccountList, Props as AccountListProps } from './AccountList';
import { MAX_ACCOUNT_COUNT, SettingData } from './AdvancedSettings';

interface Props extends AccountListProps, SettingData {}

export const AddressesInRabby: React.FC<Props> = ({
  startNo,
  data,
  ...props
}) => {
  const filterData = React.useMemo(() => {
    return data?.filter((item) => {
      return item.index >= startNo && item.index < startNo + MAX_ACCOUNT_COUNT;
    });
  }, [startNo, data]);
  return <AccountList data={filterData} {...props}></AccountList>;
};
