import { query2obj } from '@/ui/utils/url';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
// import { Switch } from 'antd';
import { useRabbyDispatch, useRabbySelector, connectStore } from 'ui/store';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
// import { PageHeader } from 'ui/component';
import { isSameAddress, useAddressSource, useWallet } from 'ui/utils';
import { AddressBackup } from './AddressBackup';
import { AddressDelete } from './AddressDelete';
import { AddressInfo } from './AddressInfo';
import './style.less';
import {
  PageBody,
  PageContainer,
  PageHeader,
  PageHeading,
} from 'ui/component/PageContainer';
import {
  AlertDialog,
  Button,
  Card,
  Flex,
  Separator,
  Switch,
  Text,
  TextField,
} from '@radix-ui/themes';

const AddressDetail = () => {
  const { t } = useTranslation();
  const { search } = useLocation();
  const dispatch = useRabbyDispatch();
  const { whitelist } = useRabbySelector((s) => ({
    whitelist: s.whitelist.whitelist,
  }));
  const wallet = useWallet();
  const qs = useMemo(() => query2obj(search), [search]) as {
    address: string;
    type: string;
    brandName: string;
    byImport?: string;
  };

  const { address, type, brandName, byImport } = qs || {};

  const source = useAddressSource({
    type,
    brandName,
    byImport: !!byImport,
    address,
  });

  // Check if the address is in the whitelist
  const isAddressChecked = whitelist.find((item) =>
    isSameAddress(item, address)
  );
  const [isWhitelistChecked, setIsWhitelistChecked] = React.useState<boolean>(
    !!isAddressChecked
  );
  const [password, setPassword] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [whitelistModalOpen, setWhitelistModalOpen] = React.useState<boolean>(
    false
  );

  useEffect(() => {
    dispatch.whitelist.getWhitelist();
  }, []);

  const handleWhitelistChange = async (checked: boolean) => {
    setIsWhitelistChecked(checked);
    setWhitelistModalOpen(true);

    /*AuthenticationModalPromise({
      title: checked
        ? t('page.addressDetail.add-to-whitelist')
        : t('page.addressDetail.remove-from-whitelist'),
      cancelText: t('global.Cancel'),
      wallet,
      validationHandler: async (password) => {
        if (checked) {
          await wallet.addWhitelist(password, address);
        } else {
          await wallet.removeWhitelist(password, address);
        }
      },
      onFinished() {
        // dispatch.whitelist.getWhitelist();
      },
      onCancel() {
        // do nothing
      },
    });*/
  };

  const handleAddToWhitelist = async () => {
    // Add to
    try {
      if (isWhitelistChecked) {
        await wallet.addWhitelist(password, address);
      } else {
        await wallet.removeWhitelist(password, address);
      }
    } catch (e) {
      console.error(e);
      setError(t('component.AuthenticationModal.passwordError'));
      setIsWhitelistChecked(isWhitelistChecked); // Revert the switch state
      return;
    }

    setWhitelistModalOpen(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError('');
  };

  if (!address) {
    return null;
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageHeading>{t('page.addressDetail.address-detail')}</PageHeading>
      </PageHeader>

      <PageBody>
        <Flex direction={'column'} gap={'2'} py={'4'}>
          <AddressInfo
            address={address}
            type={type}
            brandName={brandName}
            source={source}
          ></AddressInfo>

          <Card size={'2'}>
            <Flex justify={'between'} gap={'2'}>
              <Text size={'2'} weight={'bold'}>
                {t('page.addressDetail.add-to-whitelist')}
              </Text>

              <Switch
                checked={
                  !!whitelist.find((item) => isSameAddress(item, address))
                }
                color={'grass'}
                onCheckedChange={handleWhitelistChange}
              />

              <AlertDialog.Root
                open={whitelistModalOpen}
                onOpenChange={setWhitelistModalOpen}
              >
                <AlertDialog.Content maxWidth="450px">
                  <AlertDialog.Title>
                    {isWhitelistChecked
                      ? t('page.addressDetail.add-to-whitelist')
                      : t('page.addressDetail.remove-from-whitelist')}
                  </AlertDialog.Title>
                  {/* @ts-expect-error "This error is negligible" */}
                  <AlertDialog.Description size="2">
                    This address will be{' '}
                    {isAddressChecked ? 'removed' : 'added'} from your
                    whitelist.
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
                        {t('component.AuthenticationModal.passwordError')}
                      </Text>
                    )}
                  </Flex>

                  <Flex gap="3" mt="4" justify="end">
                    <Button
                      variant="soft"
                      color="gray"
                      size={'3'}
                      onClick={() => {
                        setIsWhitelistChecked(isWhitelistChecked);
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
                      onClick={handleAddToWhitelist}
                    >
                      {'Confirm'}
                    </Button>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
          </Card>

          <Separator size={'4'} orientation={'horizontal'} my={'2'} />

          <AddressBackup
            address={address}
            type={type}
            brandName={brandName}
          ></AddressBackup>

          <AddressDelete
            address={address}
            type={type}
            brandName={brandName}
            source={source}
          ></AddressDelete>
        </Flex>
      </PageBody>

      {/*<div className="page-address-detail overflow-auto">
        <PageHeader wrapperClassName="bg-r-neutral-bg-2" fixed>
          {t('page.addressDetail.address-detail')}
        </PageHeader>
        <AddressInfo
          address={address}
          type={type}
          brandName={brandName}
          source={source}
        ></AddressInfo>

        <div className="rabby-list">
          <div className="rabby-list-item">
            <div className="rabby-list-item-content">
              <div className="rabby-list-item-label">
                {t('page.addressDetail.add-to-whitelist')}
              </div>
              <Switch
                checked={!!whitelist.find((item) => isSameAddress(item, address))}
                onChange={handleWhitelistChange}
              />
            </div>
          </div>
        </div>

        <AddressBackup
          address={address}
          type={type}
          brandName={brandName}
        ></AddressBackup>
        <AddressDelete
          address={address}
          type={type}
          brandName={brandName}
          source={source}
        ></AddressDelete>
      </div>*/}
    </PageContainer>
  );
};

export default connectStore()(AddressDetail);
