import { Button } from 'antd';
import React from 'react';

interface Props {
  revokeList: any[];
  onRevoke: () => void;
}

export const RevokeButton: React.FC<Props> = ({ revokeList, onRevoke }) => {
  return (
    <>
      {revokeList.length > 1 && (
        <div className="mb-[16px] text-13 leading-[15px] text-gray-subTitle">
          {revokeList.length} transactions to be signed sequentially
        </div>
      )}
      <Button
        className="w-[280px] h-[60px]"
        type="primary"
        size="large"
        disabled={!revokeList.length}
        onClick={onRevoke}
      >
        Revoke {revokeList?.length > 0 ? `(${revokeList.length})` : ''}
      </Button>
    </>
  );
};
