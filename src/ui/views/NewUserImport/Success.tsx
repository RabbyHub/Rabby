import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
// import { Card } from '@/ui/component/NewUserImport';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { query2obj } from '@/ui/utils/url';
// import { Button, Input } from 'antd';
import clsx from 'clsx';
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
import { CardBody, CardContainer } from 'ui/component/CardContainer';
import {
  AlertDialog,
  Avatar,
  Box,
  Button,
  Callout,
  Card,
  Flex,
  ScrollArea,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import { LucideCheck, LucideExternalLink, LucideInfo } from 'lucide-react';

const AccountItem = ({ account }: { account: Account }) => {
  const [edit, setEdit] = useState(false);

  const [name, updateAlias] = useAlias(account!.address);

  const [localName, setLocalName] = useState(name || '');

  // const ref = useRef<Input>(null);
  const ref = useRef<HTMLInputElement>(null);

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
    <Flex direction={'column'} gap={'4'}>
      <Card>
        <Flex gap="3" align="center" justify={'between'}>
          <Box>
            <Text as="div" size="2" weight="bold">
              {name}
            </Text>
            <Text as="div" size="2" color="gray">
              {ellipsisAddress(account.address)}
            </Text>
          </Box>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button
                size={'1'}
                variant={'soft'}
                onClick={() => {
                  setEdit(true);
                  setLocalName(name || '');
                  if (!defaultName) {
                    setDefaultName(name || '');
                  }
                  ref.current?.focus();
                }}
              >
                Edit Name
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content maxWidth="400px">
              {/*<AlertDialog.Title>Edit Account Name</AlertDialog.Title>*/}
              {/* @ts-expect-error "This is not supposed to be an error" */}
              <AlertDialog.Description size="2">
                {/*<Text align={'center'}>
                  This name will be the name of this account as you will see in
                  WalletPro.
                </Text>*/}
              </AlertDialog.Description>

              <Flex direction="column" gap="6" my={'4'}>
                <Callout.Root
                  size={'1'}
                  color="gray"
                  variant="soft"
                  highContrast
                >
                  <Callout.Icon>
                    <LucideInfo size={16} />
                  </Callout.Icon>
                  {/* @ts-expect-error "This should not throw an error" */}
                  <Callout.Text weight={'medium'}>
                    This name will be the name of this account as you will see
                    in WalletPro.
                  </Callout.Text>
                </Callout.Root>
                <label>
                  {/*<Text as="div" size="2" mb="1" weight="bold">
                    Account Name
                  </Text>*/}
                  <TextField.Root
                    autoComplete={'false'}
                    autoCorrect={'false'}
                    autoFocus={true}
                    className={'h-[56px]'}
                    placeholder="Change Account name"
                    ref={ref}
                    size={'3'}
                    value={localName}
                    onChange={(e) => {
                      setLocalName(e.target.value);
                    }}
                  />
                </label>
              </Flex>

              <Flex gap="3" mt="6" justify="end">
                <AlertDialog.Cancel>
                  <Button size={'2'} variant="soft" color="gray">
                    Don't Save
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button
                    highContrast
                    size={'2'}
                    variant="solid"
                    onClick={update}
                  >
                    Save
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>
      </Card>

      {/*<div
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
            // <Input
            //   ref={ref}
            //   autoComplete="false"
            //   autoCorrect="false"
            //   className={clsx(
            //     'relative left-[-8px]',
            //     'w-[260px] h-[38px]',
            //     'border-none bg-r-neutral-card2 ',
            //     'p-8 rounded',
            //     'text-[20px] font-medium'
            //   )}
            //   value={localName}
            //   onChange={(e) => {
            //     setLocalName(e.target.value);
            //   }}
            // />
            <TextField.Root
              ref={ref}
              autoComplete={'false'}
              value={localName}
              onChange={(e) => {
                setLocalName(e.target.value);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-[38px] ">
              <span className="max-w-[300px] truncate text-r-neutral-title1">
                {name}
              </span>
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
      </div>*/}
    </Flex>
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
    <>
      <CardContainer className={'overflow-auto relative'}>
        <CardBody>
          <Flex
            direction={'column'}
            align={'center'}
            justify={'center'}
            gap={'4'}
          >
            <Flex align={'center'} justify={'center'} gap="2">
              <Avatar
                radius={'full'}
                size={'6'}
                fallback={
                  <Text color={'grass'} mt={'3'}>
                    <LucideCheck size={32} strokeWidth={4} />
                  </Text>
                }
              />
            </Flex>

            <Text align={'center'}>
              {t(
                isCreated
                  ? 'page.newUserImport.successful.create'
                  : 'page.newUserImport.successful.import'
              )}
            </Text>

            <ScrollArea className={'my-8 py-2'}>
              <Flex direction={'column'} gap={'2'}>
                {accounts?.map((account) => {
                  if (!account?.address) {
                    return null;
                  }
                  return (
                    <AccountItem key={account.address} account={account} />
                  );
                })}
                <GnosisChainList chainList={chainList} className="mt-[-4px]" />
              </Flex>
            </ScrollArea>

            <Button highContrast size={'3'} onClick={getStarted}>
              {t('page.newUserImport.successful.start')}
            </Button>

            {!!hd && (
              <Text
                align={'center'}
                className={
                  'hover:underline underline-offset-2 cursor-pointer mt-6'
                }
              >
                <Separator size={'4'} className={'my-4'} />
                {isSeedPhrase ? (
                  <Text size={'2'}>
                    {t('page.newUserImport.successful.addMoreAddr')}
                  </Text>
                ) : (
                  <Text size={'2'}>
                    {t('page.newUserImport.successful.addMoreFrom', {
                      name: brand || BRAND_ALIAN_TYPE_TEXT[hd] || hd,
                    })}
                  </Text>
                )}
                {/*<LucideExternalLink size={14} strokeWidth={3} />*/}
              </Text>
            )}

            {/*{!!hd && (
              <div
                onClick={addMoreAddr}
                className="flex items-center justify-center gap-2 text-[14px] text-r-neutral-foot mt-[23px] cursor-pointer"
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
            )}*/}
          </Flex>
        </CardBody>
      </CardContainer>

      {/*<Card className="flex flex-col">
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

        {!!hd && (
          <div
            onClick={addMoreAddr}
            className="flex items-center justify-center gap-2 text-[14px] text-r-neutral-foot mt-[23px] cursor-pointer"
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
        )}
      </Card>*/}
    </>
  );
};
