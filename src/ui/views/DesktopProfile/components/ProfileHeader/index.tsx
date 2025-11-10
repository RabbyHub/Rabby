import { EVENTS, KEYRING_TYPE } from '@/constant';
import {
  RcIconBridgeCC,
  RcIconCopyCC,
  RcIconQrCodeCC,
  RcIconSendCC,
  RcIconSpinCC,
  RcIconSwapCC,
} from '@/ui/assets/desktop/profile';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useEventBusListener } from '@/ui/hooks/useEventBusListener';
import { useRabbyDispatch } from '@/ui/store';
import { ellipsisAddress } from '@/ui/utils/address';
import { copyAddress } from '@/ui/utils/clipboard';
import { CurveChartData } from '@/ui/views/Dashboard/components/BalanceView/useCurve';
import { useRequest } from 'ahooks';
import { Popover } from 'antd';
import clsx from 'clsx';
import QRCode from 'qrcode.react';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { createGlobalStyle } from 'styled-components';
import { BalanceView } from './BalanceView';

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
  isLoading?: boolean;
}> = (props) => {
  const currentAccount = useCurrentAccount();
  const history = useHistory();
  const location = useLocation();
  const isGnosis = currentAccount?.type === KEYRING_TYPE.GnosisKeyring;
  const dispatch = useRabbyDispatch();

  const { data: pendingTxCount, runAsync } = useRequest(
    async () => {
      if (!currentAccount?.address || isGnosis) {
        return;
      }
      return dispatch.transactions.getPendingTxCountAsync(
        currentAccount?.address
      );
    },
    {
      refreshDeps: [currentAccount?.address, isGnosis],
      refreshOnWindowFocus: true,
      pollingInterval: 30_000,
    }
  );

  useEventBusListener(EVENTS.TX_SUBMITTING, runAsync);
  useEventBusListener(EVENTS.RELOAD_TX, runAsync);

  if (!currentAccount) {
    return null;
  }

  return (
    <>
      <GlobalStyle />
      <div className="px-[20px] py-[24px]">
        <div className="mb-[16px] flex items-center gap-[12px]">
          <div className="text-rb-neutral-body text-[16px] leading-[19px]">
            {ellipsisAddress(currentAccount?.address || '', true)}
          </div>
          <div className="flex items-center gap-[10px]">
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

        <div className="flex items-center gap-[12px]">
          <div
            className={clsx(
              'min-w-[100px] p-[14px] rounded-[14px] bg-rb-brand-light-1',
              'flex items-center justify-center gap-[8px] cursor-pointer',
              'text-rb-neutral-title-1 text-[14px] leading-[17px] font-semibold',
              'hover:bg-rb-brand-light-2'
              // 'hover:bg-r-blue-light1'
            )}
            onClick={() => {
              history.replace(history.location.pathname + '?action=swap');
            }}
          >
            <RcIconSwapCC />
            Swap
          </div>
          <div
            className={clsx(
              'min-w-[100px] p-[14px] rounded-[14px] bg-rb-brand-light-1',
              'flex items-center justify-center gap-[8px] cursor-pointer',
              'text-rb-neutral-title-1 text-[14px] leading-[17px] font-semibold',
              'hover:bg-rb-brand-light-2'
            )}
            onClick={() => {
              history.replace(history.location.pathname + '?action=send');
            }}
          >
            <RcIconSendCC />
            Send
          </div>
          <div
            className={clsx(
              'min-w-[100px] p-[14px] rounded-[14px] bg-rb-brand-light-1',
              'flex items-center justify-center gap-[8px] cursor-pointer',
              'text-rb-neutral-title-1 text-[14px] leading-[17px] font-semibold',
              'hover:bg-rb-brand-light-2'
            )}
            onClick={() => {
              history.replace(history.location.pathname + '?action=bridge');
            }}
          >
            <RcIconBridgeCC />
            Bridge
          </div>
          <div className="ml-auto">
            {isGnosis ? (
              <div
                className={clsx(
                  'p-[14px] rounded-[14px] bg-rb-brand-light-1',
                  'flex items-center justify-center gap-[8px] cursor-pointer',
                  'text-rb-neutral-title-1 text-[14px] leading-[17px] font-semibold',
                  'hover:bg-rb-brand-light-2'
                )}
                onClick={() => {
                  history.replace(
                    history.location.pathname + '?action=gnosis-queue'
                  );
                }}
              >
                Queue
              </div>
            ) : pendingTxCount ? (
              <div
                className={clsx(
                  'flex items-center gap-[8px] p-[12px] cursor-pointer'
                )}
                onClick={() => {
                  history.replace(
                    history.location.pathname + '?action=activities'
                  );
                }}
              >
                <RcIconSpinCC className="w-[16px] h-[16px] animate-spin text-r-orange-default" />
                <div className="text-[13px] leading-[16px] font-medium text-r-orange-default">
                  {pendingTxCount} pending
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
