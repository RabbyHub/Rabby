import React from 'react';
import AuthenticationModalPromise from 'ui/component/AuthenticationModal';
import { useWallet } from 'ui/utils';
import './style.less';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';
import { useForm } from 'antd/lib/form/Form';
import { useNavigate } from 'react-router-dom';
import { KEYRING_TYPE } from '@/constant';
import { useTranslation } from 'react-i18next';

type Props = {
  address: string;
  type: string;
  brandName?: string;
};
export const AddressBackup = ({ address, type }: Props) => {
  const { t } = useTranslation();
  const wallet = useWallet();
  const navigate = useNavigate();

  const [form] = useForm();

  if (![KEYRING_TYPE.HdKeyring, KEYRING_TYPE.SimpleKeyring].includes(type)) {
    return null;
  }

  const handleBackup = async (path: 'mneonics' | 'private-key') => {
    form.resetFields();
    let data = '';
    await AuthenticationModalPromise({
      confirmText: t('global.confirm'),
      cancelText: t('global.Cancel'),
      title:
        path === 'private-key'
          ? t('page.addressDetail.backup-private-key')
          : t('page.addressDetail.backup-seed-phrase'),
      validationHandler: async (password: string) => {
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
        navigate(`/settings/address-backup/${path}`, {
          state: {
            data: data,
          },
        });
      },
      onCancel() {
        // do nothing
      },
      wallet,
    });
  };

  return (
    <div className="rabby-list">
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
    </div>
  );
};
