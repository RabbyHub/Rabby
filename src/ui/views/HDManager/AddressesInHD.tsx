import { useWallet } from '@/ui/utils';
import { message } from 'antd';
import React from 'react';
import { Account, AccountList, Props as AccountListProps } from './AccountList';
import { MAX_ACCOUNT_COUNT, SettingData } from './AdvancedSettings';
import { HDPathType } from './HDPathTypeButton';
import { HDManagerStateContext } from './utils';
import { useRabbyDispatch } from '@/ui/store';
import { KEYRING_CLASS } from '@/constant';

interface Props extends AccountListProps, SettingData {}
const MAX_STEP_COUNT = 5;

export const AddressesInHD: React.FC<Props> = ({ type, startNo, ...props }) => {
  const [accountList, setAccountList] = React.useState<Account[]>([]);
  const wallet = useWallet();
  const [loading, setLoading] = React.useState(true);
  const stoppedRef = React.useRef(true);
  const startNoRef = React.useRef(startNo);
  const typeRef = React.useRef(type);
  const exitRef = React.useRef(false);
  const { createTask, keyringId, keyring } = React.useContext(
    HDManagerStateContext
  );
  const dispatch = useRabbyDispatch();
  const maxCountRef = React.useRef(MAX_ACCOUNT_COUNT);

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
    const oneByOne =
      typeRef.current === HDPathType.LedgerLive &&
      keyring === KEYRING_CLASS.HARDWARE.LEDGER;

    try {
      await createTask(() =>
        wallet.requestKeyring(keyring, 'unlock', keyringId, null, true)
      );
      maxCountRef.current =
        (await createTask(() =>
          wallet.requestKeyring(keyring, 'getMaxAccountLimit', keyringId, null)
        )) ?? MAX_ACCOUNT_COUNT;
      for (i = index; i < index + maxCountRef.current; ) {
        if (exitRef.current) {
          return;
        }

        if (stoppedRef.current) {
          break;
        }
        const accounts = (await createTask(() => {
          if (keyring === KEYRING_CLASS.MNEMONIC) {
            return dispatch.importMnemonics.getAccounts({
              start: i,
              end: i + MAX_STEP_COUNT,
            });
          }
          return wallet.requestKeyring(
            keyring,
            'getAddresses',
            keyringId,
            i,
            i + (oneByOne ? 1 : MAX_STEP_COUNT)
          );
        })) as Account[];
        setAccountList((prev) => [...prev, ...accounts]);
        setLoading(false);

        // only ledger live need to fetch one by one
        if (oneByOne) {
          i++;
        } else {
          i += MAX_STEP_COUNT;
        }
      }
    } catch (e) {
      message.error({
        content: e.message,
        key: 'ledger-error',
      });
    }
    stoppedRef.current = true;
    // maybe stop by manual, so we need restart
    if (i !== index + maxCountRef.current) {
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
        setLoading(true);
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

    for (let i = newData.length; i < maxCountRef.current; i++) {
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
