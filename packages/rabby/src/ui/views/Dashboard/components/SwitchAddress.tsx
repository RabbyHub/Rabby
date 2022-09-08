import React, { useState, useEffect, useRef, useMemo } from 'react';
import clsx from 'clsx';
import { Modal } from 'ui/component';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DisplayedKeryring } from 'background/service/keyring';
import { Account } from 'background/service/preference';
import { AddressList } from 'ui/component';
import { useWallet } from 'ui/utils';
import IconManageAddress from 'ui/assets/manage-address.svg';
import IconClose from 'ui/assets/close.svg';
import IconRefresh from 'ui/assets/refresh.svg';

const SwitchAddress = ({
  onChange,
  currentAccount,
  visible,
  onCancel,
}: {
  onChange(account: string, type: string, brandName: string): void;
  currentAccount: Account;
  visible: boolean;
  onCancel(): void;
}) => {
  const wallet = useWallet();
  const addressList = useRef<any>();
  const [accounts, setAccounts] = useState<DisplayedKeryring[]>([]);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const { t } = useTranslation();

  const getAllKeyrings = async () => {
    const _accounts = await wallet.getAllVisibleAccounts();
    setAccounts(_accounts);
  };

  const changeAccount = (account: string, keyring: any, brandName: string) => {
    onChange && onChange(account, keyring.type, brandName);
  };

  const handleRefreshBalance = async () => {
    if (isRefreshingBalance) return;
    setIsRefreshingBalance(true);
    await addressList.current.updateAllBalance();
    setIsRefreshingBalance(false);
  };

  useEffect(() => {
    getAllKeyrings();
  }, []);

  const CloseIcon = ({ rolling }: { rolling: boolean }) => (
    <div className="close-icon" onClick={(e) => e.stopPropagation()}>
      <a
        className="close-icon__action"
        href="javascript:;"
        onClick={(e) => {
          e.stopPropagation();
          handleRefreshBalance();
        }}
      >
        <img
          src={IconRefresh}
          className={clsx('icon icon-refresh', {
            rolling,
          })}
        />
      </a>
      <a className="close-icon__action" href="javascript:;" onClick={onCancel}>
        <img src={IconClose} className="icon icon-close" />
      </a>
    </div>
  );

  const Container = useMemo(() => {
    return (
      <div className="modal-switch-address">
        <AddressList
          ref={addressList}
          list={accounts}
          onClick={changeAccount}
          currentAccount={currentAccount}
        />
        <div className="footer">
          <Link to="/settings/address">
            <img src={IconManageAddress} className="icon icon-add" />
            {t('Manage addresses')}
          </Link>
        </div>
      </div>
    );
  }, [addressList, accounts, currentAccount, visible]);

  return accounts ? (
    <Modal
      title={t('Set Current Address')}
      visible={visible}
      width="344px"
      onCancel={onCancel}
      style={{ margin: 0, padding: 0 }}
      className="switch-address-modal"
      closeIcon={<CloseIcon rolling={isRefreshingBalance} />}
      destroyOnClose
    >
      {Container}
    </Modal>
  ) : null;
};

export default SwitchAddress;
