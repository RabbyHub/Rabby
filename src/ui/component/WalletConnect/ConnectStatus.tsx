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
            {t('component.WalletConnect.ConnectStatus.statusText.received')}
          </div>
        );
      case 'REJECTED':
      case 'DISCONNECTED':
        return (
          <div className="py-[15px]">
            <img src={TipInfoSVG} className={IconClassName} />
            {t('component.WalletConnect.ConnectStatus.statusText.rejected')}
          </div>
        );
      case 'BRAND_NAME_ERROR':
        return (
          <div className="py-[8px]">
            <div>
              <img src={TipWarningSVG} className={IconClassName} />
              {t(
                'component.WalletConnect.ConnectStatus.statusText.brandNameError'
              )}
            </div>
            <div>
              {t(
                'component.WalletConnect.ConnectStatus.statusText.brandNameError2',
                {
                  displayBrandName,
                }
              )}
            </div>
          </div>
        );
      case 'ACCOUNT_ERROR':
        return (
          <div className="py-[8px]">
            <div>
              <img src={TipWarningSVG} className={IconClassName} />
              {t(
                'component.WalletConnect.ConnectStatus.statusText.accountError'
              )}
            </div>
            <div>
              {t(
                'component.WalletConnect.ConnectStatus.statusText.accountError2'
              )}
            </div>
          </div>
        );
      case 'CONNECTED':
        return (
          <div className="py-[15px]">
            {t('component.WalletConnect.ConnectStatus.statusText.connected')}
          </div>
        );
      case 'ADDRESS_DUPLICATE':
        return (
          <div className="py-[15px]">
            {t('component.WalletConnect.ConnectStatus.statusText.duplicate')}
          </div>
        );
      default:
        return (
          <div className="py-[15px]">
            {t('component.WalletConnect.ConnectStatus.statusText.scan', {
              displayBrandName,
              wallet: hasWallet ? '' : ' wallet',
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
          'bg-[#E5E9EF] text-[#4B4D59] font-medium': !type || type === 'info',
          'bg-[#27C1930D] text-[#27C193]': type === 'success',
          'bg-[#FFB0200D] text-[#FFB020]': type === 'warning',
        }
      )}
    >
      {statusText}
    </div>
  );
};
