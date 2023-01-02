import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { useWallet } from '@/ui/utils';
import React from 'react';
import { Account, AccountList, Props as AccountListProps } from './AccountList';
import { MAX_ACCOUNT_COUNT, SettingData } from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';

interface Props extends AccountListProps, SettingData {}

export const AddressesInLedger: React.FC<Props> = ({
  type,
  startNo,
  ...props
}) => {
  const [accountList, setAccountList] = React.useState<Account[]>([]);
  const wallet = useWallet();
  const [loading, setLoading] = React.useState(false);
  const restartRef = React.useRef(false);
  const stoppedRef = React.useRef(true);
  const startNoRef = React.useRef(startNo);
  const typeRef = React.useRef(type);

  const asyncGetAccounts = React.useCallback(async () => {
    stoppedRef.current = false;
    setLoading(true);
    const start = startNoRef.current;
    const type = typeRef.current!;
    const index = start - 1;

    try {
      const hdPathBase = await wallet.requestKeyring(
        HARDWARE_KEYRING_TYPES.Ledger.type,
        'getHDPathBase',
        null,
        type
      );
      await wallet.requestKeyring(
        HARDWARE_KEYRING_TYPES.Ledger.type,
        'setHdPath',
        null,
        hdPathBase
      );
      for (let i = index; i < index + MAX_ACCOUNT_COUNT; i++) {
        if (restartRef.current) {
          restartRef.current = false;
          setAccountList([]);
          asyncGetAccounts();
          return;
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
        if (i === index + MAX_ACCOUNT_COUNT - 1) {
          stoppedRef.current = true;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  React.useEffect(() => {
    typeRef.current = type;
    startNoRef.current = startNo;

    if (type) {
      if (stoppedRef.current) {
        setAccountList([]);
        asyncGetAccounts();
      } else {
        restartRef.current = true;
      }
    }
  }, [type, startNo]);

  return (
    <AccountList
      data={accountList}
      {...props}
      loading={props.loading || loading}
    ></AccountList>
  );
};
