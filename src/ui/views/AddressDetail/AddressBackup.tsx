import React from 'react';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import { useWallet } from 'ui/utils';
import './style.less';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
import { useForm } from 'antd/lib/form/Form';
import { useHistory } from 'react-router-dom';
import { KEYRING_TYPE } from '@/constant';
import { useTranslation } from 'react-i18next';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import {
  AlertDialog,
  Button,
  Card,
  Flex,
  Text,
  TextField,
} from '@radix-ui/themes';
import { LucideChevronRight } from 'lucide-react';

type Props = {
  address: string;
  type: string;
  brandName?: string;
};
export const AddressBackup = ({ address, type }: Props) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const history = useHistory();

  const [form] = useForm();

  const [password, setPassword] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [whitelistModalOpen, setWhitelistModalOpen] = React.useState<boolean>(
    false
  );

  if (
    ![KEYRING_TYPE.HdKeyring, KEYRING_TYPE.SimpleKeyring].includes(type as any)
  ) {
    return null;
  }
  const invokeEnterPassphrase = useEnterPassphraseModal('address');

  const handleBackup = async (path: 'mneonics' | 'private-key') => {
    setWhitelistModalOpen(true);

    // form.resetFields();
    // const data = '';

    /*await AuthenticationModalPromise({
      confirmText: t('global.confirm'),
      cancelText: t('global.Cancel'),
      title:
        path === 'private-key'
          ? t('page.addressDetail.backup-private-key')
          : t('page.addressDetail.backup-seed-phrase'),
      validationHandler: async (password: string) => {
        if (type === KEYRING_TYPE.HdKeyring) {
          await invokeEnterPassphrase(address);
        }

        if (path === 'private-key') {
          data = await wallet.getPrivateKey(password, {
            address,
            type,
          });
        } else {
          data = await wallet.getMnemonics(password, address);
        }
      },
      onFinished() {
        history.push({
          pathname: `/settings/address-backup/${path}`,
          state: {
            data: data,
          },
        });
      },
      onCancel() {
        // do nothing
      },
      wallet,
    });*/
  };

  const handleConfirmBackup = async (path: 'mneonics' | 'private-key') => {
    // const path = KEYRING_TYPE.HdKeyring ? 'mneonics' : 'private-key';
    console.log('Handle confirm backup:', path, password, type);
    let data: any;

    try {
      if (type === KEYRING_TYPE.HdKeyring) {
        await invokeEnterPassphrase(address);
      }
      if (path === 'private-key') {
        console.log('Get private key for address:', address, password, type);
        data = await wallet.getPrivateKey(password, {
          address,
          type,
        });
      } else {
        console.log('Get mnemonics for address:', address, password, type);
        data = await wallet.getMnemonics(password, address);
      }
      history.push({
        pathname: `/settings/address-backup/${path}`,
        state: {
          data: data,
        },
      });
    } catch (err) {
      setError(t('component.AuthenticationModal.passwordError'));
      console.error('Handle confirm backup error', err);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError('');
  };

  return (
    <>
      {type === KEYRING_TYPE.HdKeyring && (
        <Card size={'2'} onClick={() => handleBackup('mneonics')}>
          <Flex justify={'between'} gap={'2'}>
            <Text size={'2'} weight={'bold'}>
              {t('page.addressDetail.backup-seed-phrase')}
            </Text>

            <Text size={'2'}>
              <LucideChevronRight size={14} />
            </Text>
          </Flex>
        </Card>
      )}

      <AlertDialog.Root
        open={whitelistModalOpen}
        onOpenChange={setWhitelistModalOpen}
      >
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title>
            {type === KEYRING_TYPE.HdKeyring
              ? t('page.addressDetail.backup-seed-phrase')
              : t('page.addressDetail.backup-private-key')}
          </AlertDialog.Title>
          {/* @ts-expect-error "This error is negligible" */}
          <AlertDialog.Description size="2">
            Confirm your password to proceed with the backup.
          </AlertDialog.Description>

          <Flex direction="column" gap="3" pt={'6'} pb={'2'}>
            <label>
              <TextField.Root
                className={'h-[56px]'}
                name={'password'}
                spellCheck={false}
                size={'3'}
                type={'password'}
                placeholder={t(
                  'component.AuthenticationModal.passwordPlaceholder'
                )}
                onChange={handlePasswordChange}
              />
            </label>
            {error && (
              <Text size={'1'} color={'red'} className={'capitalize'}>
                {t('component.AuthenticationModal.passwordError')} - {password}
              </Text>
            )}
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Button
              variant="soft"
              color="gray"
              size={'3'}
              onClick={() => {
                setWhitelistModalOpen(false);
              }}
            >
              {'Cancel'}
            </Button>
            <Button
              color="grass"
              disabled={!password.trim()}
              size={'3'}
              variant="solid"
              onClick={() =>
                handleConfirmBackup(
                  type === KEYRING_TYPE.HdKeyring ? 'mneonics' : 'private-key'
                )
              }
            >
              {'Confirm'}
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      <Card size={'2'} onClick={() => handleBackup('private-key')}>
        <Flex justify={'between'} gap={'2'}>
          <Text size={'2'} weight={'bold'}>
            {t('page.addressDetail.backup-private-key')}
          </Text>

          <Text size={'2'}>
            <LucideChevronRight size={14} />
          </Text>
        </Flex>
      </Card>

      {/*<div className="rabby-list">
        {type === KEYRING_TYPE.HdKeyring ? (
          <div
            className="rabby-list-item cursor-pointer"
            onClick={() => {
              handleBackup('mneonics');
            }}
          >
            <div className="rabby-list-item-content">
              <div className="rabby-list-item-label">
                {t('page.addressDetail.backup-seed-phrase')}
              </div>
              <div className="rabby-list-item-arrow">
                <IconArrowRight
                  width={16}
                  height={16}
                  viewBox="0 0 12 12"
                ></IconArrowRight>
              </div>
            </div>
          </div>
        ) : null}
        <div
          className="rabby-list-item cursor-pointer"
          onClick={() => {
            handleBackup('private-key');
          }}
        >
          <div className="rabby-list-item-content">
            <div className="rabby-list-item-label">
              {t('page.addressDetail.backup-private-key')}
            </div>
            <div className="rabby-list-item-arrow">
              <IconArrowRight
                width={16}
                height={16}
                viewBox="0 0 12 12"
              ></IconArrowRight>
            </div>
          </div>
        </div>
      </div>*/}
    </>
  );
};
