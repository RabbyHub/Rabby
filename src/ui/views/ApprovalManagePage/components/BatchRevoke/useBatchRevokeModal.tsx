import { Modal } from '@/ui/component';
import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
import React from 'react';
import { RevokeTable } from './RevokeTable';

export const useBatchRevokeModal = (props: {
  revokeList: ApprovalSpenderItemToBeRevoked[];
  onStart: () => void;
  onPause: () => void;
  onClose: () => void;
  onDone: () => void;
  onContinue: () => void;
}) => {
  const show = React.useCallback(() => {
    const modal = Modal.info({
      title: 'Batch Revoke (0/5)',
      className: 'confirm-revoke-modal',
      closable: true,
      centered: true,
      width: 964,
      okCancel: false,
      content: <RevokeTable />,
    });
  }, [props]);

  return {
    show,
  };
};
