import { HARDWARE_KEYRING_TYPES } from '@/constant';
import { useWallet } from '@/ui/utils';
import { message } from 'antd';
import React from 'react';
import { Account, AccountList, Props as AccountListProps } from './AccountList';
import { MAX_ACCOUNT_COUNT, SettingData } from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';
import { fetchAccountsInfo, LedgerManagerStateContext } from './utils';

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
  const exitRef = React.useRef(false);
  const { createTask, keyringId } = React.useContext(LedgerManagerStateContext);

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
    const isLedgerLive = typeRef.current === HDPathType.LedgerLive;

    try {
      await createTask(() =>
        wallet.requestKeyring(
          HARDWARE_KEYRING_TYPES.Ledger.type,
          'unlock',
          keyringId,
          null,
          true
        )
      );
      for (i = index; i < index + MAX_ACCOUNT_COUNT; ) {
        if (exitRef.current) {
          return;
        }

        if (stoppedRef.current) {
          break;
        }
        const accounts = (await createTask(() =>
          wallet.requestKeyring(
            HARDWARE_KEYRING_TYPES.Ledger.type,
            'getAddresses',
            keyringId,
            i,
            i + (isLedgerLive ? 1 : 5)
          )
        )) as Account[];
        const fullAccounts = await fetchAccountsInfo(wallet, accounts);
        setAccountList((prev) => [...prev, ...fullAccounts]);
        setLoading(false);

        // only ledger live need to fetch one by one
        if (isLedgerLive) {
          i++;
        } else {
          i += 5;
        }
      }
    } catch (e) {
      if (!/busy/.test(e.message)) {
        message.error({
          content: e.message,
          key: 'ledger-error',
        });
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

  const fullData = React.useMemo(() => {
    const newData = [...(accountList ?? [])];
    let lastIndex = newData[newData.length - 1]?.index ?? 0;

    for (let i = newData.length; i < MAX_ACCOUNT_COUNT; i++) {
      newData.push({
        address: '',
        index: ++lastIndex,
      });
    }
    return newData;
  }, [accountList]);

  return (
    <AccountList
      data={fullData}
      {...props}
      loading={props.loading || loading}
    ></AccountList>
  );
};
