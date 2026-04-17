import BigNumber from 'bignumber.js';
import React from 'react';

import { ReactComponent as LoadingSVG } from '@/ui/assets/approval/loading.svg';
import { ReactComponent as SuccessSVG } from '@/ui/assets/approval/success.svg';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
import { ReactComponent as RcIconLoadingCC } from '@/ui/assets/loading-cc.svg';
import { formatGasCostUsd } from '@/ui/utils';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  AssetApprovalSpenderWithStatus,
  FailedCode,
  FailReason,
} from '../hooks/useBatchRevokeTask';
import { CellText } from './Cell';

export const ListItemStatus: React.FC<{
  data: AssetApprovalSpenderWithStatus;
  isPaused: boolean;
  onStillRevoke: () => void;
}> = ({ data, isPaused, onStillRevoke }) => {
  const { t } = useTranslation();

  const failedCode =
    data.$status?.status === 'fail' ? data.$status.failedCode : undefined;
  const gasCostUsd =
    data.$status?.status === 'fail'
      ? (data.$status?.gasCost?.gasCostUsd as BigNumber | undefined)
      : undefined;

  const canStillRevoke = React.useMemo(() => {
    return failedCode === FailedCode.GasTooHigh && gasCostUsd;
  }, [failedCode, gasCostUsd]);

  if (!data) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-end">
        {data.$status?.status === 'success' && (
          <div className="flex items-center gap-[4px]">
            <SuccessSVG />
            {data.$status.gasCost ? (
              <div className="block truncate text-[13px] leading-[16px] font-medium text-r-neutral-foot">
                ${formatGasCostUsd(data.$status.gasCost.gasCostUsd)}
              </div>
            ) : null}
          </div>
        )}
        {data.$status?.status === 'fail' && (
          <Tooltip
            overlayClassName="rectangle"
            align={{
              offset: [16, 0],
            }}
            title={
              <div>
                {FailReason[failedCode ?? FailedCode.DefaultFailed]}{' '}
                {canStillRevoke && gasCostUsd
                  ? `(Est. Gas ≈$ ${formatGasCostUsd(gasCostUsd)})`
                  : ''}{' '}
                {canStillRevoke ? (
                  <span
                    className="cursor-pointer text-r-blue-default"
                    onClick={onStillRevoke}
                  >
                    {t('page.manageBatchApprovals.canStillRevoke')}
                  </span>
                ) : (
                  ''
                )}
              </div>
            }
            placement="topRight"
          >
            <RcIconWarningCC className="text-r-red-default" />
          </Tooltip>
        )}
        {data.$status?.status === 'pending' && (
          <div className="flex items-center">
            <LoadingSVG className="h-[16px] w-[16px] text-r-orange-default" />
          </div>
        )}

        {!data.$status?.status && (
          <>
            {/* {isPaused ? (
              <RcIconLoadingCC
                viewBox="0 0 24 24"
                className="w-[16px] h-[16px] text-r-orange-default mr-[4px]"
              />
            ) : null} */}
            <div className="block truncate text-[13px] leading-[16px] font-medium text-r-neutral-foot">
              {isPaused ? t('page.approvals.revokeModal.paused') : '-'}
            </div>
          </>
        )}
      </div>
    </>
  );
};
