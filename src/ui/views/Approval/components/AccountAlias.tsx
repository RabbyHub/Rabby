import React, { useEffect, useState } from 'react';
import { Account } from '@/background/service/preference';
import { useWallet } from '@/ui/utils';
import { WALLET_BRAND_CONTENT, KEYRING_ICONS } from 'consts';

const AccountAlias = ({ address }: { address: string }) => {
  const wallet = useWallet();
  const [account, setAccount] = useState<Account | null | undefined>(null);

  const handleAddressChanged = async (addr: string) => {
    const acct: Account = await wallet.getAccountByAddress(addr);
    const alias = await wallet.getAlianName(addr);
    setAccount({
      ...acct,
      alianName: alias,
    });
  };

  useEffect(() => {
    handleAddressChanged(address);
  }, [address]);

  if (!account) return null;

  return (
    <div className="flex text-13 text-r-neutral-body">
      <img
        className="icon-account w-16 mr-4"
        src={
          WALLET_BRAND_CONTENT[account.brandName]?.image ||
          KEYRING_ICONS[account.type]
        }
      />
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {account.alianName}
      </span>
    </div>
  );
};

export default AccountAlias;
