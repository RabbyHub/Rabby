import { RcIconCopyCC, RcIconQrCodeCC } from '@/ui/assets/desktop/profile';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ellipsisAddress } from '@/ui/utils/address';
import { copyAddress } from '@/ui/utils/clipboard';
import { CurveChartData } from '@/ui/views/Dashboard/components/BalanceView/useCurve';
import { Popover } from 'antd';
import QRCode from 'qrcode.react';
import React from 'react';
import { useDocumentClass } from '@/ui/hooks/useDocumentClass';
import { BalanceView } from './BalanceView';
import { SeedPhraseBackupAlert } from '@/ui/component/SeedPhraseBackupAlert';
import clsx from 'clsx';
import styles from './index.module.css';

export const ProfileHeader: React.FC<{
  balance?: number | null;
  evmBalance?: number | null;
  curveChartData?: CurveChartData;
  appChainIds: string[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?(): void;
}> = (props) => {
  const currentAccount = useCurrentAccount();
  useDocumentClass(styles.globalActive, !!currentAccount);

  if (!currentAccount) {
    return null;
  }

  return (
    <>
      <div className="px-[20px] pt-[24px] pb-[8px] relative">
        <div className="mb-[20px] flex items-center gap-[8px]">
          <div className="text-r-neutral-title1 text-[18px] leading-[21px] font-semibold">
            {currentAccount.alianName}
          </div>
          <div className="text-rb-neutral-body text-[18px] leading-[21px]">
            {ellipsisAddress(currentAccount?.address || '')}
          </div>
          <div className="flex items-center gap-[8px]">
            <div
              onClick={() => {
                copyAddress(currentAccount?.address);
              }}
              className="cursor-pointer rounded-[4px] text-rb-neutral-foot hover:bg-rb-neutral-bg-0"
            >
              <RcIconCopyCC />
            </div>
            <Popover
              placement="bottom"
              overlayClassName="global-qr-code-popover"
              trigger={'click'}
              content={
                <div>
                  <QRCode value={currentAccount.address || ''} size={250} />
                </div>
              }
            >
              <div className="cursor-pointer rounded-[4px] text-rb-neutral-foot hover:bg-rb-neutral-bg-0">
                <RcIconQrCodeCC />
              </div>
            </Popover>
            <SeedPhraseBackupAlert className={clsx('rounded-[8px]')} />
          </div>
        </div>

        <BalanceView {...props} />
      </div>
    </>
  );
};
