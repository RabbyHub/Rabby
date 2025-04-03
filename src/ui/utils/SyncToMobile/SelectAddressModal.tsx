import { Modal } from '@/ui/component';
import { Button } from 'antd';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useAccounts } from '@/ui/hooks/useAccounts';
import { SelectAddressItem } from './SelectAddressItem';
import { IDisplayedAccountWithBalance } from '@/ui/models/accountToDisplay';
import { isSameAccount, SYNC_KEYRING_TYPES } from '@/utils/account';
import { HARDWARE_KEYRING_TYPES, KEYRING_CLASS } from '@/constant';

interface Props {
  visible: boolean;
  onClose?: () => void;
  onConfirm?: (accounts: IDisplayedAccountWithBalance[]) => void;
}

export enum BAN_REASONS {
  IS_SLIP39 = 'IS_SLIP39',
  HAS_PASSPHRASE = 'HAS_PASSPHRASE',
  NOT_ALLOWED = 'NOT_ALLOWED',
}

const checkBanReason = (acc: IDisplayedAccountWithBalance) => {
  if (!SYNC_KEYRING_TYPES.includes(acc.type as any)) {
    return BAN_REASONS.NOT_ALLOWED;
  }

  if (acc.type === KEYRING_CLASS.MNEMONIC) {
    if (acc.keyring.isSlip39) {
      return BAN_REASONS.IS_SLIP39;
    }

    if (acc.keyring.needPassphrase) {
      return BAN_REASONS.HAS_PASSPHRASE;
    }
  }

  if (acc.type === KEYRING_CLASS.HARDWARE.KEYSTONE) {
    if (acc.brandName !== HARDWARE_KEYRING_TYPES.Keystone.brandName) {
      return BAN_REASONS.NOT_ALLOWED;
    }
  }

  return false;
};

export const SelectAddressModal: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = React.useState<
    IDisplayedAccountWithBalance[]
  >([]);

  const {
    sortedAccountsList,
    watchSortedAccountsList,
    fetchAllAccounts,
  } = useAccounts();

  React.useEffect(() => {
    fetchAllAccounts();
  }, []);

  const handleSelectAddress = React.useCallback(
    (acc: IDisplayedAccountWithBalance) => {
      setSelected((prev) => {
        const index = prev.findIndex((e) => isSameAccount(e, acc));
        if (index > -1) {
          return prev.filter((_, i) => i !== index);
        }
        if (!checkBanReason(acc)) {
          return [...prev, acc];
        }
        return prev;
      });
    },
    []
  );

  return (
    <ModalStyled
      visible={visible}
      onCancel={onClose}
      onOk={() => onConfirm?.(selected)}
      width={400}
      destroyOnClose
    >
      <h1
        className={clsx(
          'm-0',
          'text-r-neutral-title-1 text-[20px] font-medium leading-[24px]',
          'text-center',
          'py-[14px]'
        )}
      >
        {t('page.syncToMobile.selectAddress.title')}
      </h1>
      <section
        className={clsx(
          'flex flex-col gap-[8px] px-[16px]',
          'overflow-y-auto',
          'flex-1'
        )}
      >
        {sortedAccountsList.flat().map((account) => (
          <SelectAddressItem
            checked={selected.some((e) => isSameAccount(e, account))}
            disabled={checkBanReason(account)}
            account={account}
            key={`${account.brandName}-${account.address}`}
            onClick={handleSelectAddress}
          />
        ))}
        {watchSortedAccountsList.flat().map((account, index) => (
          <SelectAddressItem
            className={clsx(index === 0 ? 'mt-[16px]' : '')}
            checked={selected.some((e) => isSameAccount(e, account))}
            disabled={checkBanReason(account)}
            account={account}
            key={`${account.brandName}-${account.address}`}
            onClick={handleSelectAddress}
          />
        ))}
      </section>
      <footer
        className={clsx(
          'flex justify-center items-center',
          'gap-x-[8px]',
          'py-[16px] px-[20px]',
          'bg-r-neutral-bg2',
          'border-t-[0.5px] border-rabby-neutral-line'
        )}
      >
        <Button
          block
          className="h-[56px] text-[17px] rounded-[8px]"
          type="primary"
          disabled={selected?.length === 0}
          onClick={() => onConfirm?.(selected)}
        >
          {t('global.confirm')} ({selected?.length})
        </Button>
      </footer>
    </ModalStyled>
  );
};

const ModalStyled = styled(Modal)`
  .ant-modal-body {
    padding: 0;
    max-height: 600px;
    height: 600px;
    display: flex;
    flex-direction: column;
  }
  .ant-modal-content {
    border-radius: 16px;
    display: flex;
    flex-direction: column;
  }
`;
