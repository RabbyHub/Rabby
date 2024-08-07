import React from 'react';
import {
  AssetApprovalSpenderWithStatus,
  FailedCode,
  FailReason,
} from './useBatchRevokeTask';
import { ReactComponent as SuccessSVG } from '@/ui/assets/approval/success.svg';
import { ReactComponent as FailSVG } from '@/ui/assets/approval/fail.svg';
import { ReactComponent as LoadingSVG } from '@/ui/assets/approval/loading.svg';
import { formatGasCostUsd } from '@/ui/utils';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface Props {
  record: AssetApprovalSpenderWithStatus;
  onStillRevoke: () => void;
}

export const StatusRow: React.FC<Props> = ({ onStillRevoke, record }) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const [isStillRevoke, setIsStillRevoke] = React.useState(false);

  const handleStillRevoke = () => {
    setIsStillRevoke(true);
    onStillRevoke();
  };

  React.useEffect(() => {
    setIsStillRevoke(false);
    if (divRef.current && record.$status?.status === 'pending') {
      divRef.current.scrollIntoView({ block: 'end' });
    }
  }, [record.$status?.status]);

  return (
    <div
      ref={divRef}
      className="flex gap-x-6 flex-nowrap whitespace-nowrap items-center"
    >
      {(record.$status?.status === 'pending' || isStillRevoke) && (
        <LoadingSVG className="text-blue-light" />
      )}
      {record.$status?.status === 'success' && <SuccessSVG />}
      {record.$status?.status === 'fail' && !isStillRevoke && (
        <>
          <FailSVG />
          <div
            className={clsx(
              'text-r-red-default text-14 font-medium',
              'flex items-center'
            )}
          >
            <span>{FailReason[record.$status.failedCode]}</span>
            {record.$status.failedCode === FailedCode.GasTooHigh &&
              record.$status.gasCost?.gasCostUsd !== undefined && (
                <div className="ml-2">
                  <span>
                    (Est. Gas ≈$
                    {formatGasCostUsd(record.$status.gasCost.gasCostUsd)})
                  </span>
                  <span
                    className="ml-4 text-r-blue-default cursor-pointer"
                    onClick={handleStillRevoke}
                  >
                    {t('page.approvals.revokeModal.stillRevoke')}
                  </span>
                </div>
              )}
          </div>
        </>
      )}
      {!record.$status?.status && <span>-</span>}
    </div>
  );
};
