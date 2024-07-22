import React from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';

interface Props {
  revokeTxCount: number;
  onRevoke: () => void;
}

export const RevokeButton: React.FC<Props> = ({ revokeTxCount, onRevoke }) => {
  const { t } = useTranslation();

  return (
    <>
      {revokeTxCount > 1 ? (
        <div className="mt-[16px] h-[16px] mb-[16px] text-13 leading-[15px] text-r-neutral-body">
          {revokeTxCount} transaction(s) to be signed sequentially
        </div>
      ) : (
        <div className="mt-[16px] h-[16px] mb-[16px]"> </div>
      )}
      <Button
        className="w-[280px] h-[60px] text-[20px] am-revoke-btn"
        type="primary"
        size="large"
        disabled={!revokeTxCount}
        onClick={onRevoke}
      >
        {t('page.approvals.component.RevokeButton.btnText', {
          count: revokeTxCount,
        })}
      </Button>
    </>
  );
};
