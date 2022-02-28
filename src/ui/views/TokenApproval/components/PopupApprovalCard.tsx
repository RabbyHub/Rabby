import { TokenApproval } from '@/background/service/openapi';
import React from 'react';
import { Popup } from 'ui/component';
import ApprovalCard from './ApprovalCard';

interface PopupApprovalCardProps {
  visible?: boolean;
  data?: TokenApproval | null;
  onClose?(): void;
}

const PopupApprovalCard = ({
  data,
  visible,
  onClose,
}: PopupApprovalCardProps) => {
  return (
    <Popup
      visible={visible}
      onClose={onClose}
      height={580}
      closable
      className="token-approval-popup-card"
    >
      {data && (
        <>
          <ApprovalCard data={data}></ApprovalCard>
        </>
      )}
    </Popup>
  );
};

export default PopupApprovalCard;
