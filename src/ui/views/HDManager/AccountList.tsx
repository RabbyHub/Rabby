import { message, Table } from 'antd';
import React, { useEffect, useRef } from 'react';
import { ReactComponent as RcCopySVG } from 'ui/assets/icon-copy-cc.svg';
import ClipboardJS from 'clipboard';
import { AddToRabby } from './AddToRabby';
import { MAX_ACCOUNT_COUNT } from './AdvancedSettings';
import { AccountListSkeleton } from './AccountListSkeleton';
import { UsedChain } from '@rabby-wallet/rabby-api/dist/types';
import { isSameAddress, splitNumberByStep, useWallet } from '@/ui/utils';
import dayjs from 'dayjs';
import { ReactComponent as RcArrowSVG } from 'ui/assets/ledger/arrow.svg';
import clsx from 'clsx';
import { fetchAccountsInfo, HDManagerStateContext } from './utils';
import { AliasName } from './AliasName';
import { ChainList } from './ChainList';
import { HARDWARE_KEYRING_TYPES, KEYRING_CLASS } from '@/constant';
import { useRabbyDispatch } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { detectClientOS } from '@/ui/utils/os';
import { useQueryAccountsInfo } from './hooks/useQueryAccontsInfo';
import { InViewport } from './InViewport';
import { useMemoizedFn } from 'ahooks';
import { generateAliasName } from '@/utils/account';
import { uniqBy, values } from 'lodash';

const isWin32 = detectClientOS() === 'win32';

export interface Account {
  address: string;
  balance?: number;
  index: number;
  chains?: UsedChain[];
  firstTxTime?: number;
  aliasName?: string;
}

export interface Props {
  loading: boolean;
  data?: Account[];
  preventLoading?: boolean;
}

export const AccountList: React.FC<Props> = ({
  loading,
  data,
  preventLoading,
}) => {
  const wallet = useWallet();
  const [list, setList] = React.useState<Account[]>(data || []);
  const currentAccountsRef = React.useRef<Account[]>([]);
  const {
    currentAccounts,
    selectedAccounts,
    setSelectedAccounts,
    isLazyImport,
    getCurrentAccounts,
    createTask,
    keyringId,
    removeCurrentAccount,
    updateCurrentAccountAliasName,
    updateSelectedAccountAliasName,
    keyring,
    tab,
  } = React.useContext(HDManagerStateContext);
  const [loadNum, setLoadNum] = React.useState(0);
  const dispatch = useRabbyDispatch();

  console.log('data', data);

  useEffect(() => {
    currentAccountsRef.current = currentAccounts;
  }, [currentAccounts]);

  const { t } = useTranslation();

  const copy = React.useCallback((value: string) => {
    const clipboard = new ClipboardJS('.copy-icon', {
      text: function () {
        return value;
      },
    });
    clipboard.on('success', () => {
      message.success({
        content: t('global.copied'),
        key: 'ledger-success',
      });
      clipboard.destroy();
    });
  }, []);

  React.useEffect(() => {
    setList(data ?? []);
  }, [data]);

  const currentIndex = React.useMemo(() => {
    if (!preventLoading && list?.length) {
      return list.findIndex((item) => !item.address);
    }
    return -1;
  }, [list, preventLoading]);

  const handleAddAccount = React.useCallback(
    async (checked: boolean, account: Account, isHideToast?: boolean) => {
      if (checked) {
        await createTask(async () => {
          if (keyring === KEYRING_CLASS.MNEMONIC) {
            await dispatch.importMnemonics.setSelectedAccounts([
              account.address,
            ]);
            await dispatch.importMnemonics.confirmAllImportingAccountsAsync();
          } else {
            await wallet.unlockHardwareAccount(
              keyring,
              [account.index - 1],
              keyringId
            );
          }
        });

        await createTask(() =>
          wallet.requestKeyring(keyring, 'setCurrentUsedHDPathType', keyringId)
        );

        // update current account list
        await createTask(() => getCurrentAccounts());
        if (!isHideToast) {
          message.success({
            content: t('page.newAddress.hd.tooltip.added'),
          });
        }
      } else {
        await createTask(() =>
          wallet.removeAddress(
            account.address,
            keyring,
            undefined,
            keyring !== KEYRING_CLASS.MNEMONIC &&
              keyring !== KEYRING_CLASS.HARDWARE.KEYSTONE &&
              keyring !== KEYRING_CLASS.HARDWARE.GRIDPLUS
          )
        );
        removeCurrentAccount(account.address);
        if (!isHideToast) {
          message.success({
            content: t('page.newAddress.hd.tooltip.removed'),
          });
        }
      }

      return;
    },
    [keyring, keyringId, wallet]
  );

  const handleSelectAccount = useMemoizedFn(
    async (checked: boolean, account: Account) => {
      const addressCount =
        uniqBy([...currentAccounts, ...selectedAccounts], (item) =>
          item.address.toLowerCase()
        ).length || 0;

      if (checked) {
        const accountWithAlias = { ...account };
        if (keyring === KEYRING_CLASS.MNEMONIC) {
          const index = (await wallet.getKeyringIndex(keyring, keyringId)) || 0;

          const alias = generateAliasName({
            keyringType: keyring,
            keyringCount: index,
            addressCount,
          });
          wallet.updateCacheAlias({
            address: account.address,
            name: alias,
          });
          accountWithAlias.aliasName = alias;
        } else {
          const { brandName } = Object.keys(HARDWARE_KEYRING_TYPES)
            .map((key) => HARDWARE_KEYRING_TYPES[key])
            .find((item) => item.type === keyring);
          const alias = generateAliasName({
            brandName: brandName,
            keyringType: keyring,
            addressCount,
          });
          wallet.updateCacheAlias({
            address: account.address,
            name: alias,
          });
          accountWithAlias.aliasName = alias;
        }
        setSelectedAccounts((pre) => {
          return [...pre, accountWithAlias];
        });
      } else {
        setSelectedAccounts((pre) => {
          return pre.filter(
            (item) => !isSameAddress(item.address, account.address)
          );
        });
      }
    }
  );

  const handleChangeAliasName = useMemoizedFn(
    async (value: string, account?: Account) => {
      if (!account) {
        return;
      }
      await wallet.updateAlianName(account.address, value);
      if (tab === 'hd' && isLazyImport) {
        updateSelectedAccountAliasName(account.address, value);
      } else {
        updateCurrentAccountAliasName(account.address, value);
      }
    }
  );

  // fake loading progress
  React.useEffect(() => {
    let timer;
    if (loading) {
      setLoadNum(0);
      timer = setInterval(() => {
        setLoadNum((num) => {
          const random = Math.floor(Math.random() * 10) + 10;
          return num + random > 99 ? 99 : num + random;
        });
      }, 1000);
    } else {
      setLoadNum(0);
      timer && clearInterval(timer);
    }
    return () => {
      setLoadNum(0);
      timer && clearInterval(timer);
    };
  }, [loading]);

  const {
    accountsMap,
    pendingMap,
    createQueryAccountJob,
  } = useQueryAccountsInfo();

  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) {
      return;
    }
    if (tab === 'hd' && data?.[0]?.address) {
      if (isLazyImport && !selectedAccounts?.length) {
        handleSelectAccount(true, data[0]);
      }
      if (!isLazyImport && !currentAccounts?.length) {
        handleAddAccount(true, data[0], true);
      }
      initRef.current = true;
    }
  }, [isLazyImport, tab, data, selectedAccounts, currentAccounts]);

  return (
    <Table<Account>
      scroll={{ y: 'calc(100vh - 352px)' }}
      dataSource={list}
      rowKey={(record) => record.address || record.index}
      className={clsx('AccountList', isWin32 && 'is-win32')}
      loading={
        !preventLoading && loading
          ? {
              tip:
                t('page.newAddress.hd.waiting') +
                (loadNum ? ` - ${loadNum}%` : ''),
            }
          : false
      }
      pagination={false}
    >
      <Table.Column<Account>
        title={t('page.newAddress.hd.addToRabby')}
        key="add"
        render={(val, record) =>
          record.address ? (
            isLazyImport && tab === 'hd' ? (
              <AddToRabby
                checked={selectedAccounts?.some((item) =>
                  isSameAddress(item.address, record.address)
                )}
                onChange={(val) => handleSelectAccount(val, record)}
              />
            ) : (
              <AddToRabby
                checked={currentAccounts?.some((item) =>
                  isSameAddress(item.address, record.address)
                )}
                onChange={(val) => handleAddAccount(val, record)}
              />
            )
          ) : (
            <AccountListSkeleton width={52} />
          )
        }
        width={120}
        align="center"
        className="cell-add"
      />

      <Table.ColumnGroup
        title={
          <div className="column-group">
            {t('page.newAddress.hd.basicInformation')}
          </div>
        }
        className="column-group-wrap"
      >
        <Table.Column
          width={45}
          title="#"
          dataIndex="index"
          key="index"
          className="cell-index"
        />
        <Table.Column<Account>
          title={t('page.newAddress.hd.addresses')}
          dataIndex="address"
          key="address"
          render={(value: string, record, index) =>
            value ? (
              <div className="cell-address text-r-neutral-title-1">
                <span>{value.toLowerCase()}</span>
                <RcCopySVG
                  onClick={() => copy(value.toLowerCase())}
                  className="copy-icon"
                />
              </div>
            ) : (
              <AccountListSkeleton align="left" height={28} width={300}>
                {index === currentIndex
                  ? t('page.newAddress.hd.loadingAddress', [
                      index + 1,
                      MAX_ACCOUNT_COUNT,
                    ])
                  : ''}
              </AccountListSkeleton>
            )
          }
        />
        <Table.Column<Account>
          width={200}
          title={t('page.newAddress.hd.notes')}
          dataIndex="aliasName"
          key="aliasName"
          className="cell-note"
          render={(value, record) => {
            const account = (isLazyImport && tab === 'hd'
              ? selectedAccounts
              : currentAccounts
            )?.find((item) => isSameAddress(item.address, record.address));
            return !record.address ? (
              <AccountListSkeleton align="left" width={100} />
            ) : (
              <AliasName
                address={record.address}
                aliasName={account?.aliasName}
                cacheAliasName={record?.aliasName}
                disabled={!account}
                onChange={(val) => handleChangeAliasName(val, record)}
              />
            );
          }}
        />
      </Table.ColumnGroup>

      <Table.ColumnGroup className="column-group-wrap">
        <Table.Column<Account>
          title={t('page.newAddress.hd.usedChains')}
          dataIndex="usedChains"
          key="usedChains"
          width={140}
          render={(value, record) => {
            const account = accountsMap[record.address] || record;
            return (
              <InViewport
                callback={() => {
                  createQueryAccountJob(record);
                }}
              >
                {pendingMap[record.address] ? (
                  <AccountListSkeleton width={100} />
                ) : (
                  <ChainList account={account} />
                )}
              </InViewport>
            );
          }}
        />
        <Table.Column<Account>
          title={t('page.newAddress.hd.firstTransactionTime')}
          dataIndex="firstTxTime"
          key="firstTxTime"
          width={160}
          render={(_, record) => {
            const account = accountsMap[record.address] || record;
            const value = account.firstTxTime;
            return pendingMap[record.address] ? (
              <AccountListSkeleton width={100} />
            ) : value && !isNaN(value) ? (
              dayjs.unix(value).format('YYYY-MM-DD')
            ) : null;
          }}
        />
        <Table.Column<Account>
          title={t('page.newAddress.hd.balance')}
          dataIndex="balance"
          key="balance"
          width={200}
          ellipsis
          render={(balance, record) => {
            const account = accountsMap[record.address] || record;
            return pendingMap[record.address] ? (
              <AccountListSkeleton width={100} />
            ) : account.chains?.length && account.balance ? (
              `$${splitNumberByStep(account.balance.toFixed(2))}`
            ) : null;
          }}
        />
      </Table.ColumnGroup>
    </Table>
  );
};
