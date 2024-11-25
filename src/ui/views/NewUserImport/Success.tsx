import React, { useEffect, useState } from 'react';
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
import { useAsync } from 'react-use';
import { useNewUserGuideStore } from './hooks/useNewUserGuideStore';
import { BRAND_ALIAN_TYPE_TEXT, KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { useRequest } from 'ahooks';
import { GnosisChainList } from './GnosisChainList';
import { findChain } from '@/utils/chain';
import { Chain } from '@/types/chain';

const AccountItem = ({ account }: { account: Account }) => {
  const [edit, setEdit] = useState(false);

  const [name, updateAlias] = useAlias(account!.address);

  const [localName, setLocalName] = useState(name || '');

  const update = React.useCallback(() => {
    updateAlias(localName);
    setEdit(false);
  }, [updateAlias, localName]);

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
      <div className="flex items-center text-[20px] font-medium">
        {edit ? (
          <Input
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
          <RcIconConfirm
            className="w-20 h20 -ml-8px"
            viewBox="0 0 20 20"
            onClick={() => {
              update();
            }}
          />
        ) : (
          <RcIconPen
            className="w-16 h-16 cursor-pointer ml-6"
            viewBox="0 0 16 16"
            onClick={() => setEdit(true)}
          />
        )}
      </div>
      <div className="text-[15px] text-r-neutral-foot">
        {ellipsisAddress(account.address)}
      </div>
    </div>
  );
};

export const ImportOrCreatedSuccess = () => {
  const history = useHistory();
  const dispatch = useRabbyDispatch();
  const wallet = useWallet();

  const { store, setStore } = useNewUserGuideStore();

  const { t } = useTranslation();
  const { search } = useLocation();
  const { isCreated = false, hd, keyringId, brand } = React.useMemo(
    () => query2obj(search),
    [search]
  );

  const isSeedPhrase = React.useMemo(() => hd === KEYRING_CLASS.MNEMONIC, [hd]);

  const { value: accounts } = useAsync(wallet.getAllVisibleAccountsArray, []);

  const getStarted = React.useCallback(() => {
    history.push({
      pathname: '/new-user/ready',
    });
  }, []);

  const addMoreAddr = () => {
    history.push({
      pathname: '/import/select-address',

      search: `?hd=${hd}&keyringId=${keyringId}&isNewUserImport=true${
        brand ? '&brand=' + brand : ''
      }`,
    });
  };

  const closeConnect = React.useCallback(() => {
    if (store.clearKeyringId) {
      wallet.requestKeyring(hd, 'cleanUp', store.clearKeyringId, true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', () => {
      closeConnect();
      alert('close closeConnect');
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

      <div className="flex flex-col gap-16 pt-24 overflow-y-auto max-h-[324px] mb-20">
        {accounts?.map((account) => {
          if (!account?.address) {
            return null;
          }
          return <AccountItem key={account.address} account={account} />;
        })}
        <GnosisChainList chainList={chainList} className="mt-[-4px]" />
      </div>

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
            <RcIconExternalCC className="w-16 h-16" viewBox="0 0 16 17" />
          </div>
        </Button>
      )}
    </Card>
  );
};
