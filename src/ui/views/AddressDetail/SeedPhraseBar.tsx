import { KEYRING_CLASS } from '@/constant';
import AuthenticationModalPromise from '@/ui/component/AuthenticationModal';
import { openInternalPageInTab, useWallet } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';

interface Props {
  address: string;
}

export const SeedPhraseBar: React.FC<Props> = ({ address }) => {
  const wallet = useWallet();

  const goToHDManager = async () => {
    AuthenticationModalPromise({
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      title: 'Manage Seed Phrase',
      validationHandler: async (password: string) => {
        await wallet.getMnemonics(password, address);
      },
      async onFinished() {
        openInternalPageInTab(
          `import/select-address?hd=${KEYRING_CLASS.MNEMONIC}`
        );
      },
      onCancel() {
        // do nothing
      },
      wallet,
    });
  };
  return (
    <div
      onClick={goToHDManager}
      className={clsx(
        'p-[6px] bg-gray-bg rounded-[4px]',
        'text-gray-subTitle text-[12px] font-normal',
        'flex items-center justify-between',
        'connect-status',
        'cursor-pointer'
      )}
    >
      <div className="pl-[2px]">Manage addresses under this Seed Phrase </div>
      <IconArrowRight />
    </div>
  );
};
