import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import './style.less';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
// import { Button, message } from 'antd';
import {
  KEYRING_TYPE,
  WALLET_BRAND_CONTENT,
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_CLASS,
} from '@/constant';
import IconSuccess from 'ui/assets/success.svg';
import { useHistory } from 'react-router-dom';
import {
  AlertDialog,
  Button,
  Callout,
  CheckboxCards,
  Flex,
  Text,
  TextField,
} from '@radix-ui/themes';
import { toast } from 'sonner';
import { LucideBadgeInfo, LucideXCircle, LucideXOctagon } from 'lucide-react';

type AddressDeleteProps = {
  brandName?: string;
  type: string;
  address: string;
  source: string;
};

export const AddressDelete = ({
  type,
  address,
  brandName,
}: AddressDeleteProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const history = useHistory();

  const [password, setPassword] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [whitelistModalOpen, setWhitelistModalOpen] = React.useState<boolean>(
    false
  );

  const handleDeleteAddress = async () => {
    await wallet.removeAddress(
      address,
      type,
      brandName,
      !(
        type === KEYRING_TYPE.HdKeyring ||
        KEYRING_CLASS.HARDWARE.GRIDPLUS ||
        KEYRING_CLASS.HARDWARE.KEYSTONE
      )
    );
    // message.success({
    //   icon: <img src={IconSuccess} className="icon icon-success" />,
    //   content: t('global.Deleted'),
    //   duration: 0.5,
    // });
    toast.success(t('global.Deleted'));
    setVisible(false);
    setTimeout(() => {
      history.goBack();
    }, 500);
  };

  const handleClickDelete = async () => {
    if (
      type === KEYRING_TYPE.HdKeyring ||
      type === KEYRING_TYPE.SimpleKeyring
    ) {
      setWhitelistModalOpen(true);
    }

    /*if (
      type === KEYRING_TYPE.HdKeyring ||
      type === KEYRING_TYPE.SimpleKeyring
    ) {
      await AuthenticationModalPromise({
        confirmText: t('global.Confirm'),
        cancelText: t('global.Cancel'),
        title: t('page.addressDetail.delete-address'),
        description: t('page.addressDetail.delete-desc'),
        checklist: [
          t('page.manageAddress.delete-checklist-1'),
          t('page.manageAddress.delete-checklist-2'),
        ],
        onFinished() {
          handleDeleteAddress();
        },
        onCancel() {
          // do nothing
        },
        wallet,
      });
    } else {
      setVisible(true);
    }*/
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError('');
  };

  return (
    <>
      <div className="rabby-list">
        <div
          className="rabby-list-item cursor-pointer"
          onClick={handleClickDelete}
        >
          <div className="rabby-list-item-content">
            <div className="rabby-list-item-label" style={{ color: '#EC5151' }}>
              {t('page.addressDetail.delete-address')}
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

        <AlertDialog.Root
          open={whitelistModalOpen}
          onOpenChange={setWhitelistModalOpen}
        >
          <AlertDialog.Content maxWidth="450px">
            <AlertDialog.Title>
              {t('page.addressDetail.delete-address')}
            </AlertDialog.Title>
            {/* @ts-expect-error "This error is negligible" */}
            <AlertDialog.Description size="2">
              Confirm your password to proceed with the backup.
            </AlertDialog.Description>

            <Flex direction={'column'} gap={'3'}>
              <Callout.Root color="red" role={'alert'} size={'3'}>
                <Callout.Icon>
                  <LucideXCircle size={16} />
                </Callout.Icon>
                <Callout.Text>
                  {t('page.manageAddress.delete-checklist-1')}
                </Callout.Text>
              </Callout.Root>

              <Callout.Root color="gray" role={'alert'} size={'3'}>
                <Callout.Icon>
                  <LucideXOctagon size={16} />
                </Callout.Icon>
                <Callout.Text>
                  {t('page.manageAddress.delete-checklist-2')}
                </Callout.Text>
              </Callout.Root>
            </Flex>

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
                  {t('component.AuthenticationModal.passwordError')} -{' '}
                  {password}
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
                {t('global.Cancel')}
              </Button>
              <Button
                color="grass"
                disabled={!password.trim()}
                size={'3'}
                variant="solid"
                onClick={handleDeleteAddress}
              >
                {t('global.Confirm')}
              </Button>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </div>
      {/*{![KEYRING_TYPE.HdKeyring, KEYRING_TYPE.SimpleKeyring].includes(
        type as any
      ) && (
        <AddressDeleteModal
          type={type}
          brandName={brandName}
          visible={visible}
          onClose={() => {
            setVisible(false);
          }}
          onSubmit={() => {
            handleDeleteAddress();
          }}
        ></AddressDeleteModal>
      )}*/}
    </>
  );
};
type DelectModalProps = {
  visible: boolean;
  onClose(): void;
  onSubmit(): void;
};
const AddressDeleteModal = ({
  visible,
  onClose,
  onSubmit,
  brandName,
  type,
}: DelectModalProps & {
  brandName: string | undefined;
  type: string;
}) => {
  const { t } = useTranslation();
  const renderBrand = useMemo(() => {
    if (brandName && WALLET_BRAND_CONTENT[brandName]) {
      return WALLET_BRAND_CONTENT[brandName].name;
    } else if (BRAND_ALIAN_TYPE_TEXT[type]) {
      return BRAND_ALIAN_TYPE_TEXT[type];
    }
    return type;
  }, [brandName]);

  return (
    <>
      <Popup
        visible={visible}
        title={t('page.addressDetail.delete-address')}
        height={240}
        className="address-delete-modal"
        onClose={onClose}
        isSupportDarkMode
      >
        <div className="desc">
          {t('page.addressDetail.direct-delete-desc', { renderBrand })}
        </div>
        <footer className="footer flex gap-[16px]">
          <Button type="primary" size="large" block onClick={onClose}>
            {t('global.Cancel')}
          </Button>
          <Button
            onClick={onSubmit}
            type="primary"
            ghost
            size="large"
            className={'rabby-btn-ghost'}
            block
          >
            {t('page.manageAddress.confirm-delete')}
          </Button>
        </footer>
      </Popup>
    </>
  );
};
