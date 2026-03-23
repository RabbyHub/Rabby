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
import { ReactComponent as RcIconExternalCC } from '@/ui/assets/new-user-import/external-cc.svg';

import { isSameAddress, useAlias, useWallet } from '@/ui/utils';
import { ellipsisAddress } from '@/ui/utils/address';
import { Account } from '@/background/service/preference';
import { useRabbySelector } from '@/ui/store';
import { useAsync, useClickAway } from 'react-use';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { BRAND_ALIAN_TYPE_TEXT, KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useDocumentVisibility, useMemoizedFn, useRequest } from 'ahooks';
import { GnosisChainList } from './GnosisChainList';
import {
  AccountItemAddress,
  AccountItemInput,
  AccountItemInputWrapper,
  AccountItemWrapper,
} from './AccountItem';
import { findChain } from '@/utils/chain';
import { Chain } from '@/types/chain';
import styled from 'styled-components';
import stats from '@/stats';
import { matomoRequestEvent } from '@/utils/matomo-request';
import { ga4 } from '@/utils/ga4';
import browser from 'webextension-polyfill';
import { ReactComponent as RcIconTriangle } from '@/ui/assets/new-user-import/triangle.svg';
import UserGuide1 from '@/ui/assets/new-user-import/guide-1.png';
import UserGuide2 from '@/ui/assets/new-user-import/guide-2.png';
import { ReactComponent as UserGuide1Icon } from '@/ui/assets/new-user-import/guide1.svg';
import { ReactComponent as UserGuide2Icon } from '@/ui/assets/new-user-import/guide2.svg';

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

const AccountItem = ({
  account,
  autoFocus,
}: {
  account: Account;
  autoFocus?: boolean;
}) => {
  const [name, updateAlias] = useAlias(account.address);
  const [localName, setLocalName] = useState(name || '');
  const [defaultName] = useState(name || '');
  const ref = useRef<Input>(null);
  const updateRef = useRef(null);
  const init = useRef(false);
  const wallet = useWallet();

  const update = React.useCallback(() => {
    updateAlias(localName.trim() ? localName : defaultName);
  }, [defaultName, localName, updateAlias]);

  useClickAway(updateRef, () => {
    if (init.current) {
      update();
    }
  });

  useEffect(() => {
    if (name && !localName && !init.current) {
      init.current = true;
      setLocalName(name);
    }
  }, [localName, name]);

  useLayoutEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    wallet.uninstalledSyncStatus();
  }, [wallet]);

  return (
    <AccountItemWrapper>
      <AccountItemInputWrapper ref={updateRef}>
        <AccountItemInput
          ref={ref}
          autoComplete="false"
          autoCorrect="false"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              update();
            }
          }}
          value={localName}
          onChange={(event) => {
            setLocalName(event.target.value);
          }}
        />
      </AccountItemInputWrapper>
      <AccountItemAddress>
        {ellipsisAddress(account.address)}
      </AccountItemAddress>
    </AccountItemWrapper>
  );
};

export const ImportOrCreatedSuccess = () => {
  const history = useHistory();
  const wallet = useWallet();

  const { store } = useNewUserGuideStore();

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

  // const { value: allAccounts } = useAsync(
  //   wallet.getAllVisibleAccountsArray,
  //   []
  // );

  // const isNewUserImport = React.useMemo(() => {
  //   return allAccounts?.length === 1;
  // }, [!!allAccounts?.length]);

  const getStarted = React.useCallback(() => {
    // window.close();
    browser.action.openPopup();
    // if (isNewUserImport) {
    //   history.push({
    //     pathname: '/new-user/ready',
    //   });
    // } else {
    //   window.close();
    // }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框或可编辑元素上，不触发 getStarted
      const target = e.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (e.key === 'Enter' && !isInputElement) {
        getStarted();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [getStarted]);

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

  const addMore = !!accounts && accounts?.filter((e) => e.address).length > 1;

  return (
    <>
      <Card className="flex flex-col pt-[40px]">
        <RcIconChecked
          className="w-[40px] h-[40px] mb-[16px] mx-auto"
          viewBox="0 0 16 16"
        />

        <div className="text-[24px] leading-[29px] font-medium text-r-neutral-title1 text-center">
          {isCreated && !addMore
            ? t('page.newAddress.newSeedPhraseCreated')
            : addMore
            ? t('page.newAddress.addressAddedCount', {
                count: accounts.filter((e) => e.address).length,
              })
            : t('page.newAddress.addressImported')}
        </div>

        <div className="text-center text-[15px] leading-[18px] text-r-neutral-foot mt-[8px]">
          {t('page.newUserImport.successful.desc')}
        </div>

        <ScrollBarDiv className="flex flex-col gap-20 pt-24 overflow-y-scroll max-h-[324px] mb-20">
          {accounts?.map((account, index) => {
            if (!account?.address) {
              return null;
            }
            return (
              <AccountItem
                key={account.address}
                account={account}
                autoFocus={index === 0}
              />
            );
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
          {t('page.newUserImport.successful.openWallet')}
        </Button>

        {hd ? (
          isCreated && isSeedPhrase && store.seedPhrase ? (
            <Button
              size="large"
              type="ghost"
              onClick={handleBackup}
              className={clsx(
                'mt-12',
                'h-[52px] shadow-none rounded-[8px]',
                'text-blue-light',
                'border-blue-light',
                'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
                'before:content-none'
              )}
            >
              {t('page.newUserImport.successful.backupSeedPhrase')}
            </Button>
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
      <div
        className={clsx(
          'fixed top-[40px] right-[90px]',
          'w-[242px] h-[300px]',
          'py-12 px-12',
          'bg-r-neutral-card-1 rounded-[12px]'
        )}
      >
        <RcIconTriangle className="absolute top-[-39px] right-[22px]" />
        <div className="flex flex-col gap-[11px]">
          <div className="flex flex-col">
            <div className="flex items-center">
              <UserGuide1Icon className="w-[20px] h-[20px] mr-[5px]" />
              <span className="text-[12px] font-semibold text-r-neutral-title1">
                {t('page.newUserImport.readyToUse.guides.step1')}
              </span>
            </div>
            <img
              src={UserGuide1}
              alt="user-guide-1"
              className="w-[186px] h-[96px] mt-[10px] ml-[25px]"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <UserGuide2Icon className="w-[20px] h-[20px] mr-[5px]" />
              <span className="text-[12px] font-semibold text-r-neutral-title1">
                {t('page.newUserImport.readyToUse.guides.step2')}
              </span>
            </div>
            <img
              src={UserGuide2}
              alt="user-guide-2"
              className="w-[183px] h-[114px] mt-[10px] ml-[25px]"
            />
          </div>
        </div>
      </div>
    </>
  );
};
