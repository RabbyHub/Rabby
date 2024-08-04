import { Modal } from '@/ui/component';
import React from 'react';
import { RevokeTable, RevokeTableProps } from './RevokeTable';

export const useBatchRevokeModal = (props: RevokeTableProps) => {
  const [visible, setVisible] = React.useState(false);

  const show = React.useCallback(() => {
    setVisible(true);
  }, []);

  const node = React.useMemo(() => {
    return (
      <Modal
        visible={visible}
        title={`Batch Revoke (0/${props.revokeList.length})`}
        className="confirm-revoke-modal"
        closable={true}
        centered={true}
        width={964}
        okCancel={false}
        onCancel={() => setVisible(false)}
      >
        <RevokeTable {...props} />
      </Modal>
    );
  }, [visible]);

  return {
    show,
    node,
  };
};
