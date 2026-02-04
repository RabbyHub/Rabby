import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Card } from '@/ui/component/NewUserImport';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { query2obj } from '@/ui/utils/url';
import { Button, Input } from 'antd';
import clsx from 'clsx';
import { ReactComponent as RcIconChecked } from '@/ui/assets/new-user-import/check.svg';
import { ReactComponent as RcIconPen } from '@/ui/assets/new-user-import/pen.svg';
import { ReactComponent as RcIconConfirm } from '@/ui/assets/new-user-import/confirm-check.svg';
import { ReactComponent as RcIconExternalCC } from '@/ui/assets/new-user-import/external-cc.svg';

import { isSameAddress, useAlias, useWallet } from '@/ui/utils';
import { ellipsisAddress } from '@/ui/utils/address';
import { Account } from '@/background/service/preference';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { useAsync, useClickAway } from 'react-use';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { BRAND_ALIAN_TYPE_TEXT, KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useDocumentVisibility, useMemoizedFn, useRequest } from 'ahooks';
import { GnosisChainList } from './GnosisChainList';
import { findChain } from '@/utils/chain';
import { Chain } from '@/types/chain';
import styled from 'styled-components';
import stats from '@/stats';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ga4 } from '@/utils/ga4';
import browser from 'webextension-polyfill';
import { useCheckSeedPhraseBackup } from '@/ui/utils/useCheckSeedPhraseBackup';

const AccountItem = ({ account }: { account: Account }) => {
  const [edit, setEdit] = useState(false);

  const [name, updateAlias] = useAlias(account!.address);

  const [localName, setLocalName] = useState(name || '');

  const ref = useRef<Input>(null);

  const [defaultName, setDefaultName] = useState(name || '');

  const wallet = useWallet();

  const updateRef = useRef(null);

  const update = React.useCallback(() => {
    updateAlias(localName.trim() ? localName : defaultName);
    setEdit(false);
  }, [updateAlias, localName, defaultName]);

  useClickAway(updateRef, () => {
    if (edit) {
      update();
    }
  });

  useLayoutEffect(() => {
    if (edit) {
      ref.current?.focus();
    }
  }, [edit]);

  useEffect(() => {
    wallet.uninstalledSyncStatus();
  }, []);

  if (!account) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex flex-col justify-center',
        'border border-solid border-rabby-neutral-line',
        'rounded-[8px] px-[16px] py-[12px]'
      )}
    >
      <div
        ref={updateRef}
        className="flex items-center text-[20px] font-medium"
      >
        {edit ? (
          <Input
            ref={ref}
            autoComplete="false"
            autoCorrect="false"
            className={clsx(
              'relative left-[-8px]',
              'w-[180px] h-[20px]',
              'border-none bg-r-neutral-card2 text-r-neutral-title-1',
              'p-8 rounded',
              'text-[15px] leading-[18px] font-medium'
            )}
            value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-[20px]">
            <div className="max-w-[300px] text-[15px] leading-[18px] truncate text-r-neutral-title1">
              {name}
            </div>
          </div>
        )}

        {edit ? (
          <>
            <RcIconConfirm
              className="w-[16px] h-[16px] cursor-pointer"
              viewBox="0 0 20 20"
              onClick={() => {
                update();
              }}
            />
            <div
              className="flex-1 self-stretch"
              onClick={() => {
                update();
              }}
            />
          </>
        ) : (
          <RcIconPen
            className="cursor-pointer ml-6"
            onClick={() => {
              setEdit(true);
              setLocalName(name || '');
              if (!defaultName) {
                setDefaultName(name || '');
              }
              ref.current?.focus();
            }}
          />
        )}
      </div>
      <div className="text-[13px] leading-[16px] mt-[4px] text-r-neutral-foot">
        {ellipsisAddress(account.address, true)}
      </div>
    </div>
  );
};

const ScrollBarDiv = styled.div`
  overflow-y: scroll;
  &::-webkit-scrollbar {
    background-color: transparent;
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 90px;
    background: var(--r-neutral-foot, #6a7587);
  }
`;

export const ImportOrCreatedSuccess = () => {
  const history = useHistory();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();

  const { store, setStore } = useNewUserGuideStore();

  const { t } = useTranslation();
  const { search } = useLocation();
  const { isCreated: created, hd, keyringId, brand } = React.useMemo(
    () => query2obj(search),
    [search]
  );

  const isCreated = React.useMemo(() => created === 'true', [created]);

  const isSeedPhrase = React.useMemo(() => hd === KEYRING_CLASS.MNEMONIC, [hd]);

  const documentVisibility = useDocumentVisibility();
  const hasReportedRef = useRef(false);
  const { isExistedKeyring, finalMnemonics, stashKeyringId } = useRabbySelector(
    (s) => s.importMnemonics
  );
  const hasMnemonicImportContext = Boolean(finalMnemonics || stashKeyringId);

  const { value: accounts } = useAsync(async () => {
    if (documentVisibility === 'visible') {
      const accounts = await wallet.getAllVisibleAccountsArray();
      if (hd !== KEYRING_CLASS.MNEMONIC) {
        return accounts;
      }
      const addresses = await wallet.requestKeyring(
        KEYRING_TYPE.HdKeyring,
        'getAccounts',
        Number(keyringId) ?? null
      );
      if (!addresses.length) {
        return accounts;
      }
      return accounts.filter((account) =>
        addresses.some((addr) => isSameAddress(addr, account.address))
      );
    }
    return [];
  }, [documentVisibility, keyringId]);

  const { hasBackup } = useCheckSeedPhraseBackup(accounts?.[0]?.address || '');

  // const { value: allAccounts } = useAsync(
  //   wallet.getAllVisibleAccountsArray,
  //   []
  // );

  // const isNewUserImport = React.useMemo(() => {
  //   return allAccounts?.length === 1;
  // }, [!!allAccounts?.length]);

  const getStarted = React.useCallback(() => {
    window.close();
    browser.action.openPopup();
    // if (isNewUserImport) {
    //   history.push({
    //     pathname: '/new-user/ready',
    //   });
    // } else {
    //   window.close();
    // }
  }, []);

  const addMoreAddr = () => {
    const oBrand = brand !== 'null' ? brand : undefined;

    window.open(
      './index.html#/import/select-address' +
        `?hd=${hd}&keyringId=${keyringId}&isNewUserImport=true&noRedirect=true${
          oBrand ? '&brand=' + oBrand : ''
        }`,
      '_blank'
    );
  };

  const handleBackup = useMemoizedFn(() => {
    history.push(
      `/new-user/backup-seed-phrase?address=${accounts?.[0]?.address}`
    );
  });

  const closeConnect = React.useCallback(() => {
    if (store.clearKeyringId) {
      wallet.requestKeyring(hd, 'cleanUp', store.clearKeyringId, true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', () => {
      closeConnect();
    });
    return () => {
      closeConnect();
    };
  }, []);

  useEffect(() => {
    const account = accounts?.[0];
    if (!account || hasReportedRef.current) {
      return;
    }
    hasReportedRef.current = true;

    const mnemonicSource =
      account.type === KEYRING_CLASS.MNEMONIC
        ? isCreated
          ? 'New'
          : hasMnemonicImportContext && isExistedKeyring
          ? 'Add'
          : hasMnemonicImportContext && !isExistedKeyring
          ? 'Import'
          : undefined
        : undefined;

    if (Object.values(KEYRING_CLASS.HARDWARE).includes(account.type as any)) {
      stats.report('importHardware', {
        type: account.type,
      });
    }

    matomoRequestEvent({
      category: 'User',
      action: 'importAddress',
      label: mnemonicSource
        ? `${account.type}_${mnemonicSource}`
        : account.type,
    });

    ga4.fireEvent(
      `Import_${account.type}${mnemonicSource ? `_${mnemonicSource}` : ''}`,
      {
        event_category: 'Import Address',
      }
    );
  }, [accounts, hasMnemonicImportContext, isCreated, isExistedKeyring]);

  const { data: chainList } = useRequest(
    async () => {
      const account = accounts?.[0];
      if (!account) {
        return;
      }
      if (account?.type === KEYRING_TYPE.GnosisKeyring) {
        const networks = await wallet.getGnosisNetworkIds(account.address);
        return networks
          .map((networkId) => {
            return findChain({
              networkId,
            }) as Chain;
          })
          .filter((item) => !!item);
      }
    },
    {
      refreshDeps: [accounts?.[0]],
    }
  );

  return (
    <Card className="flex flex-col pt-[40px]">
      <RcIconChecked
        className="w-[40px] h-[40px] mb-[16px] mx-auto"
        viewBox="0 0 16 16"
      />

      <div className="text-[24px] leading-[29px] font-medium text-r-neutral-title1 text-center">
        {t(
          isCreated
            ? 'page.newUserImport.successful.create'
            : 'page.newUserImport.successful.import'
        )}
      </div>

      <div className="text-center text-[15px] leading-[18px] text-r-neutral-foot mt-[8px]">
        Rabby Wallet is Ready to Use!
      </div>

      <ScrollBarDiv className="flex flex-col gap-16 pt-24 overflow-y-scroll max-h-[324px] mb-20">
        {accounts?.map((account) => {
          if (!account?.address) {
            return null;
          }
          return <AccountItem key={account.address} account={account} />;
        })}
        <GnosisChainList chainList={chainList} className="mt-[-4px]" />
      </ScrollBarDiv>

      <Button
        onClick={getStarted}
        block
        type="primary"
        className={clsx(
          'mt-auto h-[52px] shadow-none rounded-[8px]',
          'text-[15px] leading-[18px] font-medium'
        )}
      >
        Open Wallet
      </Button>

      {hd ? (
        isCreated && isSeedPhrase && store.seedPhrase && !hasBackup ? (
          <div
            onClick={handleBackup}
            className="flex items-center justify-center gap-2 text-[13px] leading-[16px] min-h-[20px] text-r-neutral-foot mt-[16px] cursor-pointer"
          >
            <span>Backup Seed phrase Now</span>
          </div>
        ) : (
          <div
            onClick={addMoreAddr}
            className="flex items-center justify-center gap-2 text-[13px] leading-[16px] text-r-neutral-foot mt-[16px] cursor-pointer"
          >
            {isSeedPhrase ? (
              <span>{t('page.newUserImport.successful.addMoreAddr')}</span>
            ) : (
              <span>
                {t('page.newUserImport.successful.addMoreFrom', {
                  name: brand || BRAND_ALIAN_TYPE_TEXT[hd] || hd,
                })}
              </span>
            )}
            <RcIconExternalCC className="w-20 h-20" viewBox="0 0 16 17" />
          </div>
        )
      ) : null}
    </Card>
  );
};
