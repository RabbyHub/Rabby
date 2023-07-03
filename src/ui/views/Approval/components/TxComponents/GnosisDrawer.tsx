import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { groupBy } from 'lodash';
import clsx from 'clsx';
import { SafeInfo } from '@rabby-wallet/gnosis-sdk/src/api';
import { Button } from 'antd';
import { Account } from 'background/service/preference';

import { useWallet, isSameAddress } from 'ui/utils';
import { NameAndAddress } from 'ui/component';

import { KEYRING_TYPE, KEYRING_CLASS } from 'consts';
import FieldCheckbox from 'ui/component/FieldCheckbox';
import IconTagYou from 'ui/assets/tag-you.svg';
import IconTagNotYou from 'ui/assets/tag-notyou.svg';
import { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';

interface GnosisDrawerProps {
  // safeInfo: SafeInfo;
  safeInfo: BasicSafeInfo;
  onCancel(): void;
  onConfirm(account: Account, isNew?: boolean): Promise<void>;
}

interface Signature {
  data: string;
  signer: string;
}

interface AddressItemProps {
  account: Account;
  signed: boolean;
  onSelect(account: Account): void;
  checked: boolean;
}

const ownerPriority = [
  KEYRING_TYPE.SimpleKeyring,
  KEYRING_CLASS.MNEMONIC,
  KEYRING_CLASS.HARDWARE.LEDGER,
  KEYRING_CLASS.HARDWARE.ONEKEY,
  KEYRING_CLASS.HARDWARE.TREZOR,
  KEYRING_CLASS.HARDWARE.BITBOX02,
  KEYRING_CLASS.WALLETCONNECT,
  KEYRING_CLASS.WATCH,
];

const AddressItem = ({
  account,
  signed,
  onSelect,
  checked,
}: AddressItemProps) => {
  return (
    <FieldCheckbox
      className={clsx(
        'item',
        !account.type || signed ? 'cursor-default' : 'cursor-pointer',
        {
          disabled: !account.type,
        }
      )}
      showCheckbox={!!account.type}
      rightSlot={
        signed ? <span className="text-green text-14">Signed</span> : undefined
      }
      onChange={(checked) => checked && onSelect(account)}
      checked={checked}
      disable={!account.type || signed}
    >
      <NameAndAddress
        address={account.address}
        nameClass={clsx(
          signed ? 'max-100' : 'max-115',
          !account.type && 'no-name'
        )}
        noNameClass="no-name"
      />
      <img
        src={account.type ? IconTagYou : IconTagNotYou}
        className="icon icon-tag"
      />
    </FieldCheckbox>
  );
};

const GnosisDrawer = ({ safeInfo, onCancel, onConfirm }: GnosisDrawerProps) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [ownerAccounts, setOwnerAccounts] = useState<Account[]>([]);
  const [checkedAccount, setCheckedAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sortOwners = async () => {
    const accounts: Account[] = await wallet.getAllVisibleAccountsArray();
    const owners = safeInfo.owners;
    const ownersInWallet = accounts.filter((account) =>
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
    const notInWalletOwners = owners.filter(
      (owner) => !result.find((item) => isSameAddress(item.address, owner))
    );
    setOwnerAccounts([
      ...result,
      ...notInWalletOwners.map((owner) => ({
        address: owner,
        type: '',
        brandName: '',
      })),
    ]);
  };

  const handleSelectAccount = (account: Account) => {
    setCheckedAccount(account);
  };

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      checkedAccount &&
        (await onConfirm(checkedAccount, signatures.length <= 0));
      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const init = async () => {
    const sigs = await wallet.getGnosisTransactionSignatures();
    setSignatures(sigs);
    sortOwners();
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="gnosis-drawer-container">
      <div className="title">
        {safeInfo.threshold - signatures.length > 0
          ? `${safeInfo.threshold - signatures.length} more confirmation needed`
          : t('Enough signature collected')}
      </div>
      <div className="list">
        {ownerAccounts.map((owner) => (
          <AddressItem
            key={owner.address}
            account={owner}
            signed={
              !!signatures.find((sig) =>
                isSameAddress(sig.signer, owner.address)
              )
            }
            onSelect={handleSelectAccount}
            checked={
              checkedAccount
                ? isSameAddress(owner.address, checkedAccount.address)
                : false
            }
          />
        ))}
      </div>
      <div className="footer">
        <Button type="primary" onClick={onCancel}>
          {t('Back')}
        </Button>
        <Button
          type="primary"
          onClick={handleConfirm}
          disabled={!checkedAccount}
          loading={isLoading}
        >
          {t('Proceed')}
        </Button>
      </div>
    </div>
  );
};

export default GnosisDrawer;
