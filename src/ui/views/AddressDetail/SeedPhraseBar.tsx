import { KEYRING_CLASS } from '@/constant';
import AuthenticationModalPromise from '@/ui/component/AuthenticationModal';
import { useEnterPassphraseModal } from '@/ui/hooks/useEnterPassphraseModal';
import { usePopupContainer } from '@/ui/hooks/usePopupContainer';
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
  const invokeEnterPassphrase = useEnterPassphraseModal('address');
  const { getContainer } = usePopupContainer();

  const goToHDManager = async () => {
    const passphrase = await invokeEnterPassphrase(address);
    const mnemonics = await wallet.getMnemonicByAddress(address);
    const result = await wallet.generateKeyringWithMnemonic(
      mnemonics,
      passphrase
    );
    const keyringId = result.keyringId;

    openInternalPageInTab(
      `import/select-address?hd=${KEYRING_CLASS.MNEMONIC}&keyringId=${keyringId}`
    );
  };
  return (
    <div
      onClick={goToHDManager}
      className={clsx(
        'p-[6px] bg-r-neutral-card-2 rounded-[4px]',
        'text-r-neutral-body text-[12px] font-normal',
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
