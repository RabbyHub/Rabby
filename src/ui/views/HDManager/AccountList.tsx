import { message, Table } from 'antd';
import React, { useEffect } from 'react';
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
import { KEYRING_CLASS } from '@/constant';
import { useRabbyDispatch } from '@/ui/store';
import { useTranslation } from 'react-i18next';
import { detectClientOS } from '@/ui/utils/os';

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
  const [list, setList] = React.useState<Account[]>([]);
  const infoRef = React.useRef<HTMLDivElement>(null);
  const currentAccountsRef = React.useRef<Account[]>([]);
  const [infoColumnWidth, setInfoColumnWidth] = React.useState(0);
  const [infoColumnTop, setInfoColumnTop] = React.useState(0);
  const {
    currentAccounts,
    getCurrentAccounts,
    hiddenInfo,
    setHiddenInfo,
    createTask,
    keyringId,
    removeCurrentAccount,
    updateCurrentAccountAliasName,
    keyring,
  } = React.useContext(HDManagerStateContext);
  const [loadNum, setLoadNum] = React.useState(0);
  const dispatch = useRabbyDispatch();

  useEffect(() => {
    currentAccountsRef.current = currentAccounts;
  }, [currentAccounts]);

  const toggleHiddenInfo = React.useCallback(
    (e: React.MouseEvent, val: boolean) => {
      e.preventDefault();
      setHiddenInfo(val);
    },
    []
  );
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
    if (!hiddenInfo) {
      fetchAccountsInfo(wallet, data ?? []).then(setList);
    } else {
      setList(data ?? []);
    }
  }, [hiddenInfo, data]);

  const currentIndex = React.useMemo(() => {
    if (!preventLoading && list?.length) {
      return list.findIndex((item) => !item.address);
    }
    return -1;
  }, [list, preventLoading]);

  const handleAddAccount = React.useCallback(
    async (checked: boolean, account: Account) => {
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
        message.success({
          content: t('page.newAddress.hd.tooltip.added'),
        });
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
        message.success({
          content: t('page.newAddress.hd.tooltip.removed'),
        });
      }

      return;
    },
    [keyring, keyringId, wallet]
  );

  const handleChangeAliasName = React.useCallback(
    async (value: string, account?: Account) => {
      if (!account) {
        return;
      }
      await wallet.updateAlianName(account.address, value);
      updateCurrentAccountAliasName(account.address, value);
      return;
    },
    []
  );

  React.useEffect(() => {
    // watch infoRef resize
    const resizeObserver = new ResizeObserver(() => {
      setInfoColumnWidth(infoRef.current?.parentElement?.offsetWidth ?? 0);
      setInfoColumnTop(infoRef.current?.closest('thead')?.offsetHeight ?? 0);
    });
    resizeObserver.observe(infoRef.current ?? new Element());
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

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
      summary={() =>
        list.length && hiddenInfo ? (
          <tr
            onClick={(e) => toggleHiddenInfo(e, !hiddenInfo)}
            className={clsx('info-mask', {
              'info-mask--center': list.length < 4,
            })}
            style={{
              top: `${infoColumnTop}px`,
              width: `${infoColumnWidth + (isWin32 ? 6 : 1)}px`,
            }}
          >
            <td>
              <RcArrowSVG className="icon text-r-neutral-title-1" />
              <span>{t('page.newAddress.hd.clickToGetInfo')}</span>
            </td>
          </tr>
        ) : null
      }
    >
      <Table.Column<Account>
        title={t('page.newAddress.hd.addToRabby')}
        key="add"
        render={(val, record) =>
          record.address ? (
            <AddToRabby
              checked={currentAccounts?.some((item) =>
                isSameAddress(item.address, record.address)
              )}
              onChange={(val) => handleAddAccount(val, record)}
            />
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
            const account = currentAccounts?.find((item) =>
              isSameAddress(item.address, record.address)
            );
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

      <Table.ColumnGroup
        className="column-group-wrap"
        title={
          <div ref={infoRef} className="column-group">
            <a href="#" onClick={(e) => toggleHiddenInfo(e, !hiddenInfo)}>
              {hiddenInfo
                ? t('page.newAddress.hd.getOnChainInformation')
                : t('page.newAddress.hd.hideOnChainInformation')}
            </a>
          </div>
        }
      >
        <Table.Column<Account>
          title={t('page.newAddress.hd.usedChains')}
          dataIndex="usedChains"
          key="usedChains"
          width={140}
          render={(value, record) =>
            hiddenInfo ? (
              <AccountListSkeleton width={100} />
            ) : (
              <ChainList account={record} />
            )
          }
        />
        <Table.Column<Account>
          title={t('page.newAddress.hd.firstTransactionTime')}
          dataIndex="firstTxTime"
          key="firstTxTime"
          width={160}
          render={(value) =>
            hiddenInfo ? (
              <AccountListSkeleton width={100} />
            ) : !isNaN(value) ? (
              dayjs.unix(value).format('YYYY-MM-DD')
            ) : null
          }
        />
        <Table.Column<Account>
          title={t('page.newAddress.hd.balance')}
          dataIndex="balance"
          key="balance"
          width={200}
          ellipsis
          render={(balance, record) =>
            hiddenInfo ? (
              <AccountListSkeleton width={100} />
            ) : record.chains?.length && balance ? (
              `$${splitNumberByStep(balance.toFixed(2))}`
            ) : null
          }
        />
      </Table.ColumnGroup>
    </Table>
  );
};
