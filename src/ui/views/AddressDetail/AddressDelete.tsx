import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Popup } from 'ui/component';
import { useWallet } from 'ui/utils';
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
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
import { UI_TYPE } from '@/constant/ui';
import { useHandleDeleteHdKeyringAndSimpleKeyringAccount } from '@/ui/hooks/useDeleteHdOrPrivateKeyringAddress';

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
  const { getContainer } = usePopupContainer();

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
      content: t('global.Deleted'),
      duration: 0.5,
    });
    setVisible(false);
    if (UI_TYPE.isDesktop) {
      history.replace(history.location.pathname);
    } else {
      setTimeout(() => {
        history.goBack();
      }, 500);
    }
  };

  const {
    deleteAccount,
    renderDelete,
  } = useHandleDeleteHdKeyringAndSimpleKeyringAccount();

  const handleClickDelete = async () => {
    if (
      type === KEYRING_TYPE.HdKeyring ||
      type === KEYRING_TYPE.SimpleKeyring
    ) {
      await deleteAccount({
        address,
        type,
        brandName,
        getContainer,
        onFinished: () => {
          setVisible(false);
          if (UI_TYPE.isDesktop) {
            history.replace(history.location.pathname);
          } else {
            setTimeout(() => {
              history.goBack();
            }, 500);
          }
        },
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
      </div>
      {![KEYRING_TYPE.HdKeyring, KEYRING_TYPE.SimpleKeyring].includes(
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
      )}
      <>{renderDelete()}</>
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
  const { getContainer } = usePopupContainer();
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
      title={t('page.addressDetail.delete-address')}
      height={240}
      className="address-delete-modal"
      onClose={onClose}
      isSupportDarkMode
      getContainer={getContainer}
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
  );
};
