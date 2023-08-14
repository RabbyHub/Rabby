import React from 'react';
import { useTranslation } from 'react-i18next';
import { Account } from 'background/service/preference';
import { useSessionNetworkStatus } from '@/ui/component/WalletConnect/useSessionNetworkStatus';
import FastSVG from 'ui/assets/connect/fast.svg';
import LowSVG from 'ui/assets/connect/low.svg';
import LowerSVG from 'ui/assets/connect/lower.svg';
import { Tooltip } from 'antd';

export interface Props {
  account: Account;
  className?: string;
}

export const NetworkStatus: React.FC<Props> = ({ account, className }) => {
  const { status, delay } = useSessionNetworkStatus(account);
  const { t } = useTranslation();

  const iconUrl = React.useMemo(() => {
    switch (status) {
      case 'FAST':
        return FastSVG;
      case 'LOW':
        return LowSVG;
      case 'LOWER':
      default:
        return LowerSVG;
    }
  }, [status]);

  return (
    <div className={className}>
      <Tooltip
        placement="right"
        title={
          <div className="text-white">
            {t('page.signFooterBar.walletConnect.latency')} {delay}ms
          </div>
        }
      >
        <img src={iconUrl} className="w-[20px] h-[20px]" />
      </Tooltip>
    </div>
  );
};
