import BigNumber from 'bignumber.js';
import React from 'react';

import { ReactComponent as LoadingSVG } from '@/ui/assets/approval/loading.svg';
import { ReactComponent as SuccessSVG } from '@/ui/assets/approval/success.svg';
import { ReactComponent as RcIconWarningCC } from '@/ui/assets/warning-cc.svg';
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
          <div className="flex items-center gap-[2px]">
            <SuccessSVG className="mb-[2px]" />
            {data.$status.gasCost ? (
              <CellText>
                ${formatGasCostUsd(data.$status.gasCost.gasCostUsd)}
              </CellText>
            ) : null}
          </div>
        )}
        {data.$status?.status === 'fail' && (
          <Tooltip
            overlayClassName="rectangle"
            title={
              <div>
                {FailReason[failedCode ?? FailedCode.DefaultFailed]}{' '}
                {canStillRevoke && gasCostUsd
                  ? `(Est. Gas ≈$ ${formatGasCostUsd(gasCostUsd)})`
                  : ''}
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
            placement="top"
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
          <CellText>
            {isPaused ? t('page.approvals.revokeModal.paused') : '-'}
          </CellText>
        )}
      </div>
    </>
  );
};
