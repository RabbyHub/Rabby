import { KEYRING_CLASS } from '@/constant';
import AuthenticationModalPromise from '@/ui/component/AuthenticationModal';
import { openInternalPageInTab, useWallet } from '@/ui/utils';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';

interface Props {
  address: string;
}

export const SeedPhraseBar: React.FC<Props> = ({ address }) => {
  const wallet = useWallet();
  const { t } = useTranslation();

  const goToHDManager = async () => {
    let keyringId;
    AuthenticationModalPromise({
      confirmText: t('global.Confirm'),
      cancelText: t('global.Cancel'),
      title: t('page.addressDetail.manage-seed-phrase'),
      validationHandler: async (password: string) => {
        await wallet.getMnemonics(password, address);
        const mnemonics = await wallet.getMnemonicByAddress(address);
        // TODO
        const result = await wallet.generateKeyringWithMnemonic(
          mnemonics,
          'passphprase'
        );
        keyringId = result.keyringId;
      },
      async onFinished() {
        openInternalPageInTab(
          `import/select-address?hd=${KEYRING_CLASS.MNEMONIC}&keyringId=${keyringId}`
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
      <div className="pl-[2px]">
        {t('page.addressDetail.manage-addresses-under-this-seed-phrase')}{' '}
      </div>
      <IconArrowRight width={16} height={16} viewBox="0 0 12 12" />
    </div>
  );
};
