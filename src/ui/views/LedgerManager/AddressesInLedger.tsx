import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { useWallet } from '@/ui/utils';
import { message } from 'antd';
import React from 'react';
import { Account, AccountList, Props as AccountListProps } from './AccountList';
import { MAX_ACCOUNT_COUNT, SettingData } from './AdvancedSettings';
import { sleep } from './utils';

interface Props extends AccountListProps, SettingData {}

export const AddressesInLedger: React.FC<Props> = ({
  type,
  startNo,
  ...props
}) => {
  const [accountList, setAccountList] = React.useState<Account[]>([]);
  const wallet = useWallet();
  const [loading, setLoading] = React.useState(false);
  const stoppedRef = React.useRef(true);
  const startNoRef = React.useRef(startNo);
  const typeRef = React.useRef(type);
  const retryCountRef = React.useRef(0);
  const exitRef = React.useRef(false);

  const runGetAccounts = React.useCallback(async () => {
    setAccountList([]);
    asyncGetAccounts();
  }, []);

  const asyncGetAccounts = React.useCallback(async () => {
    stoppedRef.current = false;
    setLoading(true);
    const start = startNoRef.current;
    const index = start - 1;
    let i = index;

    try {
      for (i = index; i < index + MAX_ACCOUNT_COUNT; i++) {
        if (exitRef.current) {
          return;
        }

        if (stoppedRef.current) {
          break;
        }
        const accounts = (await wallet.requestKeyring(
          HARDWARE_KEYRING_TYPES.Ledger.type,
          'getAddresses',
          null,
          i,
          i + 1
        )) as Account[];
        setAccountList((prev) => [...prev, ...accounts]);
        setLoading(false);
      }
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
        runGetAccounts();
      } else {
        message.error(e.message);
      }
    }
    stoppedRef.current = true;
    // maybe stop by manual, so we need restart
    if (i !== index + MAX_ACCOUNT_COUNT) {
      runGetAccounts();
    }
  }, []);

  React.useEffect(() => {
    typeRef.current = type;
    startNoRef.current = startNo;

    if (type) {
      if (stoppedRef.current) {
        runGetAccounts();
      } else {
        stoppedRef.current = true;
      }
    }
  }, [type, startNo]);

  React.useEffect(() => {
    return () => {
      exitRef.current = true;
    };
  }, []);

  return (
    <AccountList
      data={accountList}
      {...props}
      loading={props.loading || loading}
    ></AccountList>
  );
};
