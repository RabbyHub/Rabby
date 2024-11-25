import { KEYRING_CLASS } from '@/constant';
import { useGridPlusStatus } from '@/ui/component/ConnectStatus/useGridPlusStatus';
import { openInternalPageInTab, useWallet } from '@/ui/utils';
import { useKeystoneDeviceConnected } from '@/ui/utils/keystone';
import { useLedgerDeviceConnected } from '@/ui/utils/ledger';
import { useMemoizedFn } from 'ahooks';
import clsx from 'clsx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconArrowRight } from 'ui/assets/arrow-right-gray.svg';

interface Props {
  address: string;
  type: string;
  brand: string;
}

export const HardwareBar: React.FC<Props> = ({ address, type, brand }) => {
  const wallet = useWallet();
  const { t } = useTranslation();
  const isLedgerConnected = useLedgerDeviceConnected();
  const isKeystoneConnected = useKeystoneDeviceConnected();
  const { status: gridPlusStatus } = useGridPlusStatus();
  const isGridPlusConnected = gridPlusStatus === 'CONNECTED';

  const goToHDManager = useMemoizedFn(async () => {
    if (type === KEYRING_CLASS.HARDWARE.BITBOX02) {
      openInternalPageInTab('import/hardware?connectType=BITBOX02');
    } else if (type === KEYRING_CLASS.HARDWARE.GRIDPLUS) {
      // todo check status
      openInternalPageInTab('import/hardware?connectType=GRIDPLUS');
    } else if (type === KEYRING_CLASS.HARDWARE.TREZOR) {
      openInternalPageInTab('import/hardware?connectType=TREZOR');
    } else if (type === KEYRING_CLASS.HARDWARE.LEDGER) {
      if (isLedgerConnected) {
        openInternalPageInTab(`import/select-address?hd=${type}`);
      } else {
        openInternalPageInTab('import/hardware/ledger-connect');
      }
    } else if (type === KEYRING_CLASS.HARDWARE.ONEKEY) {
      openInternalPageInTab('import/hardware?connectType=ONEKEY');
    } else if (type === KEYRING_CLASS.HARDWARE.KEYSTONE) {
      openInternalPageInTab(`import/select-address?hd=${type}&brand=${brand}`);
      // if (brand === WALLET_BRAND_TYPES.KEYSTONE) {
      //   if (isKeystoneConnected) {
      //     openInternalPageInTab(
      //       `import/select-address?hd=${type}&brand=${brand}`
      //     );
      //   } else {
      //     openInternalPageInTab('import/hardware/keystone');
      //   }
      // } else {
      //   openInternalPageInTab(`import/hardware/qrcode?brand=${brand}`);
      // }
    } else if (type === KEYRING_CLASS.HARDWARE.IMKEY) {
      openInternalPageInTab('import/hardware/imkey-connect');
    }
  });

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
        {t('page.addressDetail.manage-addresses-under', {
          brand: brand,
        })}
      </div>
      <IconArrowRight width={16} height={16} viewBox="0 0 12 12" />
    </div>
  );
};
