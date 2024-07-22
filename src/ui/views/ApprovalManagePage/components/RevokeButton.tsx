import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { RevokeSummary } from '../useApprovalsPage';

interface Props {
  revokeStatics: RevokeSummary['statics'];
  onRevoke: () => void;
}

export const RevokeButton: React.FC<Props> = ({ revokeStatics, onRevoke }) => {
  const { t } = useTranslation();

  return (
    <>
      {revokeStatics.txCount > 1 ? (
        <div className="mt-[16px] h-[16px] mb-[16px] text-13 leading-[15px] text-r-neutral-body">
          {revokeStatics.txCount} transactions to be signed sequentially
        </div>
      ) : (
        <div className="mt-[16px] h-[16px] mb-[16px]"> </div>
      )}
      <Button
        className="w-[280px] h-[60px] text-[20px] am-revoke-btn"
        type="primary"
        size="large"
        disabled={!revokeStatics.txCount}
        onClick={onRevoke}
      >
        {t('page.approvals.component.RevokeButton.btnText', {
          count: revokeStatics.txCount,
        })}
      </Button>
    </>
  );
};
