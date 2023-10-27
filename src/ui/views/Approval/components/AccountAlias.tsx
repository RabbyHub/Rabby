import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Account } from '@/background/service/preference';
import { useWallet } from '@/ui/utils';
import { WALLET_BRAND_CONTENT, KEYRING_ICONS } from 'consts';

const Wrapper = styled.div`
  display: flex;
  font-size: 13px;
  color: var(--r-neutral-body, #3e495e);
  .icon-account {
    width: 16px;
    margin-right: 4px;
  }
`;

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
    <Wrapper>
      <img
        className="icon-account"
        src={
          WALLET_BRAND_CONTENT[account.brandName]?.image ||
          KEYRING_ICONS[account.type]
        }
      />
      <span className="flex-1 overflow-hidden overflow-ellipsis whitespace-nowrap">
        {account.alianName}
      </span>
    </Wrapper>
  );
};

export default AccountAlias;
