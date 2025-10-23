import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { ellipsisAddress } from '@/ui/utils/address';
import clsx from 'clsx';
import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BalanceView } from './BalanceView';
import {
  RcIconBridgeCC,
  RcIconCopyCC,
  RcIconQrCodeCC,
  RcIconSendCC,
  RcIconSpinCC,
  RcIconSwapCC,
} from '@/ui/assets/desktop/profile';
import { copyAddress } from '@/ui/utils/clipboard';
import { Popover } from 'antd';
import QRCode from 'qrcode.react';
import styled, { createGlobalStyle } from 'styled-components';
import IconPendingTx from 'ui/assets/dashboard/pending-tx.svg';
import { SignatureRecordModal } from '../SignatureRecordModal';
import { GnosisQueueModal } from '../GnosisQueueModal';
import { KEYRING_TYPE } from '@/constant';
import { useRequest } from 'ahooks';
import { useRabbyDispatch, useRabbySelector } from '@/ui/store';
import { CurveChartData } from '@/ui/views/Dashboard/components/BalanceView/useCurve';

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
  const [isShowRecordModal, setIsShowRecordModal] = useState(false);
  const [isShowQueueModal, setIsShowQueueModal] = useState(false);
  const isGnosis = currentAccount?.type === KEYRING_TYPE.GnosisKeyring;
  const dispatch = useRabbyDispatch();

  const pendingTxCount = useRabbySelector(
    (store) => store.transactions.pendingTransactionCount
  );

  useRequest(
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

  if (!currentAccount) {
    return null;
  }

  return (
    <>
      <GlobalStyle />
      <div className="px-[20px] py-[24px]">
        <div className="mb-[16px] flex items-center gap-[8px]">
          {ellipsisAddress(currentAccount?.address || '')}
          <div
            className={clsx(
              'border-[1px] border-solid border-rabby-neutral-line rounded-[4px] text-r-neutral-foot cursor-pointer',
              'hover:bg-r-blue-light1 hover:border-rabby-blue-default hover:text-r-blue-default'
            )}
            onClick={() => {
              copyAddress(currentAccount?.address);
            }}
          >
            <RcIconCopyCC />
          </div>
          <Popover
            placement="bottom"
            overlayClassName="global-qr-code-popover"
            content={
              <div>
                <QRCode value={currentAccount.address || ''} size={250} />
              </div>
            }
          >
            <div
              className={clsx(
                'border-[1px] border-solid border-rabby-neutral-line rounded-[4px] text-r-neutral-foot cursor-pointer',
                'hover:bg-r-blue-light1 hover:border-rabby-blue-default hover:text-r-blue-default'
              )}
            >
              <RcIconQrCodeCC />
            </div>
          </Popover>
        </div>

        <BalanceView {...props} />

        <div className="flex items-center gap-[12px]">
          <div
            className={clsx(
              'w-[112px] px-[16px] py-[12px] rounded-[8px] bg-r-neutral-card-2',
              'flex items-center gap-[8px] cursor-pointer',
              'text-r-neutral-title1 text-[13px] leading-[16px] font-medium'
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
              'w-[112px] px-[16px] py-[12px] rounded-[8px] bg-r-neutral-card-2',
              'flex items-center gap-[8px] cursor-pointer',
              'text-r-neutral-title1 text-[13px] leading-[16px] font-medium'
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
              'w-[112px] px-[16px] py-[12px] rounded-[8px] bg-r-neutral-card-2',
              'flex items-center gap-[8px] cursor-pointer',
              'text-r-neutral-title1 text-[13px] leading-[16px] font-medium'
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
                  'px-[16px] py-[12px] rounded-[8px] bg-r-neutral-card-2',
                  'flex items-center gap-[8px] cursor-pointer',
                  'text-r-neutral-title1 text-[13px] leading-[16px] font-medium'
                )}
                onClick={() => {
                  setIsShowQueueModal(true);
                }}
              >
                Queue
              </div>
            ) : pendingTxCount ? (
              <div
                className={clsx(
                  'flex items-center gap-[8px] p-[12px] cursor-pointer',
                  'rounded-[8px] border-[1px] border-solid border-rabby-orange-default'
                )}
                onClick={() => {
                  setIsShowRecordModal(true);
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

      <SignatureRecordModal
        visible={isShowRecordModal}
        onCancel={() => {
          setIsShowRecordModal(false);
        }}
        destroyOnClose
      />

      <GnosisQueueModal
        visible={isShowQueueModal}
        onCancel={() => {
          setIsShowQueueModal(false);
        }}
        destroyOnClose
      />
    </>
  );
};
