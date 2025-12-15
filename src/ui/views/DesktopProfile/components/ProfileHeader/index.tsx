import { RcIconCopyCC, RcIconQrCodeCC } from '@/ui/assets/desktop/profile';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ellipsisAddress } from '@/ui/utils/address';
import { copyAddress } from '@/ui/utils/clipboard';
import { CurveChartData } from '@/ui/views/Dashboard/components/BalanceView/useCurve';
import { useRequest } from 'ahooks';
import { Popover } from 'antd';
import QRCode from 'qrcode.react';
import React, { useEffect } from 'react';
import { createGlobalStyle } from 'styled-components';
import { BalanceView } from './BalanceView';
import { useWallet } from '@/ui/utils';
import { onBackgroundStoreChanged } from '@/ui/utils/broadcastToUI';

const GlobalStyle = createGlobalStyle`
  .global-qr-code-popover {
    .ant-popover-arrow {
      display: none;
    }
    .ant-popover-inner {
      border-radius: 8px;
      border: 1px solid var(--r-neutral-line, #E0E5EC);
      box-shadow: none;
    }
    .ant-popover-inner-content {
      padding: 14px;
    }
  }
`;

export const ProfileHeader: React.FC<{
  balance?: number | null;
  evmBalance?: number | null;
  curveChartData?: CurveChartData;
  appChainIds: string[];
  isLoading?: boolean;
  onRefresh?(): void;
}> = (props) => {
  const currentAccount = useCurrentAccount();

  const wallet = useWallet();

  const { data: alias, runAsync: runFetchAlias } = useRequest(
    async () => {
      if (!currentAccount?.address) {
        return '';
      }
      return wallet.getAlianName(currentAccount?.address || '');
    },
    {
      refreshDeps: [currentAccount?.address],
    }
  );

  useEffect(() => {
    return onBackgroundStoreChanged('contactBook', (payload) => {
      runFetchAlias();
    });
  }, [runFetchAlias]);

  if (!currentAccount) {
    return null;
  }

  return (
    <>
      <GlobalStyle />
      <div className="px-[20px] py-[24px] relative">
        <div className="mb-[16px] flex items-center gap-[8px]">
          <div className="text-r-neutral-title1 text-[18px] font-semibold">
            {alias}
          </div>
          <div className="text-rb-neutral-body text-[18px] ">
            {ellipsisAddress(currentAccount?.address || '', true)}
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
          </div>
        </div>

        <BalanceView {...props} />
      </div>
    </>
  );
};
