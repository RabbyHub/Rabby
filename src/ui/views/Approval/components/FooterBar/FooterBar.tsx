import React from 'react';
import { AccountInfo } from './AccountInfo';
import { useWallet } from '@/ui/utils';
import { Account } from '@/background/service/preference';
import { ActionGroup, Props as ActionGroupProps } from './ActionGroup';
import clsx from 'clsx';
import { Chain } from '@debank/common';

interface Props extends Omit<ActionGroupProps, 'account'> {
  chain?: Chain;
}

export const FooterBar: React.FC<Props> = (props) => {
  const [account, setAccount] = React.useState<Account>();
  const wallet = useWallet();

  const init = async () => {
    const currentAccount = await wallet.syncGetCurrentAccount();
    if (currentAccount) setAccount(currentAccount);
  };

  React.useEffect(() => {
    init();
  }, []);

  if (!account) {
    return null;
  }

  return (
    <section
      className={clsx(
        'space-y-[16px]',
        'bg-white',
        'rounded-tl-[16px] rounded-tr-[16px] p-[20px]',
        'fixed bottom-0 left-0 right-0'
      )}
      style={{
        boxShadow: '0px -8px 24px rgba(0, 0, 0, 0.1)',
      }}
    >
      <AccountInfo chain={props.chain} account={account} />
      <ActionGroup account={account} {...props} />
    </section>
  );
};
