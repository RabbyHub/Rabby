import { BasicSafeInfo } from '@rabby-wallet/gnosis-sdk';
import { SafeMessage } from '@safe-global/api-kit';
import { Button } from 'antd';
import { Account } from 'background/service/preference';
import clsx from 'clsx';
import { groupBy } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isSameAddress, useWallet } from 'ui/utils';
import { AddressItem, ownerPriority } from './DrawerAddressItem';

interface GnosisDrawerProps {
  // safeInfo: SafeInfo;
  safeInfo: BasicSafeInfo;
  onCancel(): void;
  onConfirm(account: Account, isNew?: boolean): Promise<void> | void;
  confirmations?: SafeMessage['confirmations'];
}

interface Signature {
  data: string;
  signer: string;
}

const GnosisDrawer = ({
  safeInfo,
  onCancel,
  onConfirm,
  confirmations,
}: GnosisDrawerProps) => {
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
    const groupOwners = groupBy(ownersInWallet, (item) =>
      item.address.toLowerCase()
    );
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
    if (result.length === 1) {
      setCheckedAccount(result[0]);
    }
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
    sortOwners();
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (confirmations) {
      setSignatures(
        confirmations.map((item) => {
          return {
            signer: item.owner,
            data: item.signature,
          };
        })
      );
    } else {
      wallet.getGnosisTransactionSignatures().then(setSignatures);
    }
  }, [confirmations]);

  return (
    <div className="gnosis-drawer-container">
      <div className="text-[18px] leading-[21px] font-medium text-r-neutral-title1 text-center mb-[16px]">
        {safeInfo.threshold - signatures.length > 0
          ? t('page.signTx.moreSafeSigNeeded', [
              safeInfo.threshold - signatures.length,
            ])
          : t('page.signTx.enoughSafeSigCollected')}
      </div>
      <div className="list space-y-[12px]">
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
      <div className="footer mx-[-20px] mb-[-24px] py-[16px] px-[20px] border-t-[1px] border-t-r-neutral-card2 bg-r-neutral-card1">
        <Button
          type="primary"
          ghost
          onClick={onCancel}
          className={clsx(
            'h-[48px]',
            'border-blue-light text-blue-light',
            'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
            'rounded-[8px]',
            'before:content-none'
          )}
        >
          {t('global.backButton')}
        </Button>
        <Button
          type="primary"
          onClick={handleConfirm}
          disabled={!checkedAccount}
          loading={isLoading}
          className="h-[48px]"
        >
          {t('global.proceedButton')}
        </Button>
      </div>
    </div>
  );
};

export default GnosisDrawer;
