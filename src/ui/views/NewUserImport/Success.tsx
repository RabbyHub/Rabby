import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

import { useAlias, useWallet } from '@/ui/utils';
import { ellipsisAddress } from '@/ui/utils/address';
import { Account } from '@/background/service/preference';
import { useRabbyDispatch } from '@/ui/store';
import { useAsync, useClickAway } from 'react-use';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { BRAND_ALIAN_TYPE_TEXT, KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useDocumentVisibility, useRequest } from 'ahooks';
import { GnosisChainList } from './GnosisChainList';
import { findChain } from '@/utils/chain';
import { Chain } from '@/types/chain';
import styled from 'styled-components';

const AccountItem = ({ account }: { account: Account }) => {
  const [edit, setEdit] = useState(false);

  const [name, updateAlias] = useAlias(account!.address);

  const [localName, setLocalName] = useState(name || '');

  const ref = useRef<Input>(null);

  const [defaultName, setDefaultName] = useState(name || '');

  const updateRef = useRef(null);

  const update = React.useCallback(() => {
    updateAlias(localName.trim() ? localName : defaultName);
    setEdit(false);
  }, [updateAlias, localName, defaultName]);

  useClickAway(updateRef, () => {
    console.log('edit', edit);
    if (edit) {
      update();
    }
  });

  useLayoutEffect(() => {
    if (edit) {
      ref.current?.focus();
    }
  }, [edit]);

  if (!account) {
    return null;
  }

  return (
    <div
      className={clsx(
        'flex flex-col justify-center',
        'border border-solid border-rabby-neutral-line',
        'rounded-[8px] p-16 pt-8'
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
              'w-[260px] h-[38px]',
              'border-none bg-r-neutral-card2 ',
              'p-8 rounded',
              'text-[20px] font-medium'
            )}
            value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-[38px] ">
            <span className="max-w-[300px] truncate">{name}</span>
          </div>
        )}

        {edit ? (
          <>
            <RcIconConfirm
              className="w-20 h20 -ml-8px cursor-pointer"
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
            className="w-16 h-16 cursor-pointer ml-6"
            viewBox="0 0 16 16"
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
      <div className="text-[15px] text-r-neutral-foot">
        {ellipsisAddress(account.address)}
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

  const { value: accounts } = useAsync(wallet.getAllVisibleAccountsArray, [
    documentVisibility,
  ]);

  const getStarted = React.useCallback(() => {
    history.push({
      pathname: '/new-user/ready',
    });
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
    <Card className="flex flex-col">
      <RcIconChecked
        className="w-[52px] h-[52px] mt-[60px] mb-20 mx-auto"
        viewBox="0 0 16 16"
      />

      <div className="text-24 font-medium text-r-neutral-title1 text-center">
        {t(
          isCreated
            ? 'page.newUserImport.successful.create'
            : 'page.newUserImport.successful.import'
        )}
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
          'mt-auto h-[56px] shadow-none rounded-[8px]',
          'text-[17px] font-medium'
        )}
      >
        {t('page.newUserImport.successful.start')}
      </Button>

      {!!hd && isSeedPhrase && (
        <div
          onClick={addMoreAddr}
          className="flex items-center justify-center gap-2 text-[14px] text-r-neutral-foot mt-[23px] cursor-pointer"
        >
          <span>{t('page.newUserImport.successful.addMoreAddr')}</span>
          <RcIconExternalCC className="w-16 h-16" viewBox="0 0 16 17" />
        </div>
      )}
      {!!hd && !isSeedPhrase && (
        <Button
          onClick={addMoreAddr}
          block
          type="primary"
          ghost
          className={clsx(
            'mt-16 h-[56px] shadow-none rounded-[8px]',
            'text-[17px] font-medium',
            'hover:bg-light-r-blue-light1 hover:before:hidden hover:border-rabby-blue-default hover:text-r-blue-default'
          )}
        >
          <div className="inline-flex items-center justify-center gap-2">
            <span>
              {t('page.newUserImport.successful.addMoreFrom', {
                name: BRAND_ALIAN_TYPE_TEXT[hd] || hd,
              })}
            </span>
            <RcIconExternalCC
              className="w-[18px] h-[18px]"
              viewBox="0 0 16 17"
            />
          </div>
        </Button>
      )}
    </Card>
  );
};
