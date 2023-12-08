import React from 'react';
import clsx from 'clsx';

import TipInfoSVG from 'ui/assets/approval/tip-info.svg';
import TipWarningSVG from 'ui/assets/approval/tip-warning.svg';
import TipSuccessSVG from 'ui/assets/approval/tip-success.svg';
import { useSessionStatus } from './useSessionStatus';
import { Account } from '@/background/service/preference';
import { useDisplayBrandName } from './useDisplayBrandName';
import { useBrandNameHasWallet } from './useBrandNameHasWallet';
import { useTranslation } from 'react-i18next';

interface Props {
  brandName?: string;
  account?: Account;
  uri: string;
}
export const ConnectStatus: React.FC<Props> = ({ brandName, account }) => {
  const { status } = useSessionStatus(account, false, true);
  const [displayBrandName] = useDisplayBrandName(brandName);
  const hasWallet = useBrandNameHasWallet(displayBrandName);
  const IconClassName = 'inline-block mr-[6px] w-[14px] h-[14px] mb-2';
  const { t } = useTranslation();

  const statusText = React.useMemo(() => {
    switch (status) {
      case 'RECEIVED':
        return (
          <div className="py-[15px]">
            <img src={TipSuccessSVG} className={IconClassName} />
            {t('page.newAddress.walletConnect.status.received')}
          </div>
        );
      case 'REJECTED':
      case 'DISCONNECTED':
        return (
          <div className="py-[15px]">
            <img src={TipInfoSVG} className={IconClassName} />
            {t('page.newAddress.walletConnect.status.rejected')}
          </div>
        );
      case 'BRAND_NAME_ERROR':
        return (
          <div className="py-[8px]">
            <div>
              <img src={TipWarningSVG} className={IconClassName} />
              {t('page.newAddress.walletConnect.status.brandError')}
            </div>
            <div>
              {t('page.newAddress.walletConnect.status.brandErrorDesc', {
                brandName: displayBrandName,
              })}
            </div>
          </div>
        );
      case 'ACCOUNT_ERROR':
        return (
          <div className="py-[8px]">
            <div>
              <img src={TipWarningSVG} className={IconClassName} />
              {t('page.newAddress.walletConnect.status.accountError')}
            </div>
            <div>
              {t('page.newAddress.walletConnect.status.accountErrorDesc')}
            </div>
          </div>
        );
      case 'CONNECTED':
        return (
          <div className="py-[15px]">
            {t('page.newAddress.walletConnect.status.connected')}
          </div>
        );
      case 'ADDRESS_DUPLICATE':
        return (
          <div className="py-[15px]">
            {t('page.newAddress.walletConnect.status.duplicate')}
          </div>
        );
      default:
        return (
          <div className="py-[15px]">
            {t('page.newAddress.walletConnect.status.default', {
              brand: `${displayBrandName}${hasWallet ? '' : ' wallet'}`,
            })}
          </div>
        );
    }
  }, [status, displayBrandName]);

  const type = React.useMemo(() => {
    switch (status) {
      case 'RECEIVED':
      case 'CONNECTED':
        return 'success';
      case 'BRAND_NAME_ERROR':
      case 'ACCOUNT_ERROR':
      case 'ADDRESS_DUPLICATE':
        return 'warning';
      case 'REJECTED':
      case 'DISCONNECTED':
      default:
        return 'info';
    }
  }, [status]);

  return (
    <div
      className={clsx(
        'session-status',
        'rounded-[4px] mt-[40px] m-auto',
        'w-[360px] text-center leading-none',
        'text-13',
        {
          'bg-r-neutral-line text-r-neutral-title-1 font-medium':
            !type || type === 'info',
          'bg-r-green-light text-r-green-default': type === 'success',
          'bg-r-orange-light text-r-orange-default': type === 'warning',
        }
      )}
    >
      {statusText}
    </div>
  );
};
