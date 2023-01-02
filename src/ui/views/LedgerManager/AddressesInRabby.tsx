import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { useWallet } from '@/ui/utils';
import { message } from 'antd';
import React from 'react';
import { Account, AccountList, Props as AccountListProps } from './AccountList';
import { SettingData } from './AdvancedSettings';
import { sleep } from './utils';

interface Props extends AccountListProps, SettingData {}

export const AddressesInRabby: React.FC<Props> = ({ type, ...props }) => {
  const wallet = useWallet();
  const [loading, setLoading] = React.useState(false);
  const retryCountRef = React.useRef(0);
  const [accountList, setAccountList] = React.useState<Account[]>([]);

  const getCurrentAccounts = React.useCallback(async () => {
    try {
      setLoading(true);
      const accounts = (await wallet.requestKeyring(
        HARDWARE_KEYRING_TYPES.Ledger.type,
        'getCurrentAccounts',
        null
      )) as string[];
      console.log('accounts', accounts);
    } catch (e) {
      // maybe request not finished in previous tab
      if (/busy/.test(e.message)) {
        await sleep(1000);
        if (retryCountRef.current > 3) {
          retryCountRef.current = 0;
          message.error('Ledger is busy, please try again later');
          return;
        }

        retryCountRef.current += 1;
        getCurrentAccounts();
      } else {
        message.error(e.message);
      }
    }
    setLoading(false);
    retryCountRef.current = 0;
  }, []);

  React.useEffect(() => {
    if (type) {
      getCurrentAccounts();
    }
  }, [type]);
  return (
    <AccountList
      data={accountList}
      {...props}
      loading={props.loading || loading}
    ></AccountList>
  );
};
