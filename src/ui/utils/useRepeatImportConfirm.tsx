import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { isSameAddress, useWallet } from '@/ui/utils';
import { AccountItem } from '@/ui/component/AccountSelector/AccountItem';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import './confirmPopup.less';
import { UI_TYPE } from '@/constant/ui';

type NullFunction = () => void;
let cleanup: NullFunction | undefined;

export const useRepeatImportConfirm = () => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [modal, contextHolder] = Modal.useModal();
  const history = useHistory();

  const { accountsList } = useRabbySelector((s) => ({
    ...s.accountToDisplay,
  }));
  const dispatch = useRabbyDispatch();

  useEffect(() => {
    dispatch.addressManagement.getHilightedAddressesAsync().then(() => {
      dispatch.accountToDisplay.getAllAccountsToDisplay();
    });
  }, []);
  const show = async ({ address, type }: { address: string; type: string }) => {
    const account = accountsList.find(
      (item) => isSameAddress(item.address, address) && item.type === type
    );

    if (cleanup) {
      cleanup();
    }

    if (account) {
      cleanup = modal.confirm({
        title: (
          <div>
            <div>{t('page.newAddress.privateKey.repeatImportTips.desc')}</div>
            <div>
              {t('page.newAddress.privateKey.repeatImportTips.question')}
            </div>
          </div>
        ),
        content: (
          <AccountItem
            address={address}
            type={account.type}
            brandName={account.type}
            balance={account.balance}
            className="confirm-address-item"
          />
        ),
        onOk: () => {
          wallet.changeAccount(account).then(() => {
            if (UI_TYPE.isDesktop) {
              history.replace(history.location.pathname);
            } else {
              history.push('/dashboard');
            }
          });
        },
        okText: t('global.confirm'),
        cancelText: t('global.Cancel'),
        width: 360,
        centered: true,
        autoFocusButton: null,
        className: 'confirm-modal',
      }).destroy;
    }
  };
  return {
    show,
    contextHolder,
  };
};
