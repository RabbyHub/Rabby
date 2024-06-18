import { Modal } from 'antd';
import { t } from 'i18next';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { isSameAddress, useWallet } from '.';
import AddressCard from '../component/AddressCard';
import { useRabbyDispatch, useRabbySelector } from '../store';

export const useRepeatImportConfirm = () => {
  const wallet = useWallet();

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
  const run = async ({
    address,
    type,
    action,
  }: {
    address: string;
    type: string;
    action: () => void;
  }) => {
    const account = accountsList.find(
      (item) => isSameAddress(item.address, address) && item.type === type
    );

    if (account) {
      modal.confirm({
        title: t('page.newAddress.privateKey.repeatImportTips'),
        content: (
          <AddressCard
            address={address}
            type={account.type}
            brandName={account.type}
            balance={account.balance}
          />
        ),
        onOk: () => {
          wallet.changeAccount(account).then(() => {
            history.push('/dashboard');
          });
        },
        okText: t('global.confirm'),
        cancelText: t('global.Cancel'),
        width: 360,
        centered: true,
        className: 'confirm-modal',
      });
    } else {
      await action();
    }
  };
  return {
    run,
    contextHolder,
  };
};
