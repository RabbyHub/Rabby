import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import './style.less';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
import { Button, message } from 'antd';
import {
  KEYRING_TYPE,
  WALLET_BRAND_CONTENT,
  BRAND_ALIAN_TYPE_TEXT,
  KEYRING_CLASS,
} from '@/constant';
import IconSuccess from 'ui/assets/success.svg';
import { useHistory } from 'react-router-dom';

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

  const handleDeleteAddress = async () => {
    await wallet.removeAddress(
      address,
      type,
      brandName,
      type === KEYRING_TYPE.HdKeyring ||
        KEYRING_CLASS.HARDWARE.GRIDPLUS ||
        KEYRING_CLASS.HARDWARE.KEYSTONE
        ? false
        : true
    );
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('Deleted'),
      duration: 0.5,
    });
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
      await AuthenticationModalPromise({
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        title: 'Delete address',
        description:
          'Before you delete, keep the following points in mind to understand how to protect your assets.',
        checklist: [
          'I understand that if I delete this address, the corresponding Private Key & Seed Phrase of this address will be deleted and Rabby will NOT be able to recover it.',
          "I confirm that I have backuped the private key or Seed Phrase and I'm ready to delete it now.",
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
    }
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
              Delete Address
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
      </div>
      {![KEYRING_TYPE.HdKeyring, KEYRING_TYPE.SimpleKeyring].includes(type) && (
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
      )}
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
    <Popup
      visible={visible}
      title={t('Delete address')}
      height={240}
      className="address-delete-modal"
      onClose={onClose}
    >
      <div className="desc">
        This address is a {renderBrand} address, Rabby does not store the
        private key or seed phrase for this address, you can just delete it
      </div>
      <footer className="footer flex gap-[16px]">
        <Button type="primary" size="large" block onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          type="primary"
          ghost
          size="large"
          className={'rabby-btn-ghost'}
          block
        >
          Confirm Delete
        </Button>
      </footer>
    </Popup>
  );
};
