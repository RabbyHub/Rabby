import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { groupBy } from 'lodash';
import { Button } from 'antd';
import { Account } from 'background/service/preference';
import { useWallet, isSameAddress } from 'ui/utils';
import { ownerPriority } from './DrawerAddressItem';
import EmptyIcon from '@/ui/assets/dashboard/empty.svg';
import { KEYRING_CLASS } from '@/constant';
import { AccountItem } from '@/ui/component/AccountSelectDrawer';
import styled from 'styled-components';

const ListStyled = styled.div`
  .item {
    height: 52px;
    min-height: 52px;
  }

  .icon-keyring {
    margin-right: 6px;
  }

  .alian-name {
    color: var(--r-neutral-title-1);
    font-size: 13px;
    margin: 0;
    font-weight: 500;
  }

  .address-viewer-text {
    color: #4b4d59;
    font-size: 12px;
    font-weight: 400;
  }

  .item-container {
    justify-content: space-between;
    align-items: center;
    margin-right: 12px;
  }
`;

interface CoboDelegatedDrawerProps {
  owners: string[];
  onCancel(): void;
  onConfirm(account: Account, isNew?: boolean): Promise<void>;
  networkId: string;
}

export const CoboDelegatedDrawer = ({
  owners,
  onCancel,
  onConfirm,
  networkId,
}: CoboDelegatedDrawerProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [ownerAccounts, setOwnerAccounts] = useState<Account[]>([]);
  const [checkedAccount, setCheckedAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sortOwners = async () => {
    const accounts: Account[] = await wallet.getAllVisibleAccountsArray();
    const ownersInWallet = accounts
      .filter((item) => item.type !== KEYRING_CLASS.WATCH)
      .filter((account) =>
        owners.find((owner) => isSameAddress(account.address, owner))
      );
    const groupOwners = groupBy(ownersInWallet, 'address');
    const result = Object.keys(groupOwners).map((address) => {
      let target = groupOwners[address][0];
      if (groupOwners[address].length === 1) {
        return target;
      }
      for (let i = 0; i < ownerPriority.length; i++) {
        const tmp = groupOwners[address].find(
          (account) => account.type === ownerPriority[i]
        );
        if (tmp) {
          target = tmp;
          break;
        }
      }
      return target;
    });

    setOwnerAccounts([...result]);
  };

  const handleSelectAccount = (account: Account) => {
    setCheckedAccount(account);
  };

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      checkedAccount && (await onConfirm(checkedAccount));
      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const init = async () => {
    sortOwners();
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="gnosis-drawer-container">
      {ownerAccounts.length ? (
        <div className="title mb-[16px]">
          {t('page.signTx.importedDelegatedAddress')}
        </div>
      ) : null}
      <ListStyled className="list space-y-8">
        {ownerAccounts.length ? (
          ownerAccounts.map((owner) => (
            <AccountItem
              key={owner.address}
              account={owner}
              checked={
                checkedAccount
                  ? isSameAddress(owner.address, checkedAccount.address)
                  : false
              }
              onSelect={handleSelectAccount}
              networkId={networkId}
            />
          ))
        ) : (
          <div className="text-center mt-12">
            <img className="w-[40px] mb-16 mx-auto" src={EmptyIcon} />
            <p className="text-20 leading-[23px] mb-12 text-r-neutral-title-1">
              {t('page.signTx.noDelegatedAddress')}
            </p>
          </div>
        )}
      </ListStyled>
      <div className="footer">
        <Button type="primary" onClick={onCancel}>
          {t('global.Cancel')}
        </Button>
        <Button
          type="primary"
          onClick={handleConfirm}
          disabled={!checkedAccount}
          loading={isLoading}
        >
          {t('global.proceedButton')}
        </Button>
      </div>
    </div>
  );
};
