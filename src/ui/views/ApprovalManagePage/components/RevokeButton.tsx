import { Button } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  revokeList: any[];
  onRevoke: () => void;
}

export const RevokeButton: React.FC<Props> = ({ revokeList, onRevoke }) => {
  const { t } = useTranslation();
  return (
    <>
      {revokeList.length > 1 ? (
        <div className="mt-[16px] h-[16px] mb-[16px] text-13 leading-[15px] text-r-neutral-body">
          {revokeList.length} transactions to be signed sequentially
        </div>
      ) : (
        <div className="mt-[16px] h-[16px] mb-[16px]"> </div>
      )}
      <Button
        className="w-[280px] h-[60px] text-[20px] am-revoke-btn"
        type="primary"
        size="large"
        disabled={!revokeList.length}
        onClick={onRevoke}
      >
        {t('page.approvals.component.RevokeButton.btnText', {
          count: revokeList.length,
        })}
      </Button>
    </>
  );
};
