import React from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

import {
  FILTER_TYPES,
  useApprovalsPage,
} from '../hooks/useManageApprovalsPage';
import { useEIP7702Approvals } from '../hooks/useEIP7702Approvals';

export const ApprovalsBottomBar: React.FC = () => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const {
    filterType,
    currentRevokeList,
    revokeSummary,
    onRevoke,
  } = useApprovalsPage();
  const {
    selectedRows,
    handleEIP7702Revoke,
    refresh,
    isSupportedAccount,
  } = useEIP7702Approvals();

  const isEIP7702 = filterType === FILTER_TYPES.EIP7702;

  const { couldSubmit, buttonTitle, isDisabled } = React.useMemo(() => {
    const revokeCount = isEIP7702
      ? selectedRows.length
      : revokeSummary.statics.txCount;
    const displayCount = isEIP7702
      ? selectedRows.length
      : currentRevokeList.length;
    const unsupported = isEIP7702 && !isSupportedAccount;

    return {
      couldSubmit: !!revokeCount,
      buttonTitle: [
        t('page.manageApprovals.revoke'),
        revokeCount ? ` (${displayCount})` : '',
      ]
        .filter(Boolean)
        .join(''),
      isDisabled: unsupported || revokeCount <= 0,
    };
  }, [
    currentRevokeList.length,
    isEIP7702,
    isSupportedAccount,
    revokeSummary.statics.txCount,
    selectedRows.length,
    t,
  ]);

  const handleClick = React.useCallback(async () => {
    if (isSubmitting || isDisabled) {
      return;
    }

    try {
      setIsSubmitting(true);
      if (filterType === FILTER_TYPES.EIP7702) {
        await handleEIP7702Revoke();
        refresh();
        return;
      }

      await onRevoke();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    filterType,
    handleEIP7702Revoke,
    isDisabled,
    isSubmitting,
    onRevoke,
    refresh,
  ]);

  return (
    <footer className="border-t-[0.5px] border-rabby-neutral-line bg-r-neutral-bg-2 px-[20px] py-[14px]">
      <Button
        type="primary"
        block
        loading={isSubmitting}
        disabled={isDisabled}
        className="h-[44px] rounded-[8px] text-[15px] leading-[18px]"
        onClick={handleClick}
      >
        {buttonTitle}
      </Button>
    </footer>
  );
};
