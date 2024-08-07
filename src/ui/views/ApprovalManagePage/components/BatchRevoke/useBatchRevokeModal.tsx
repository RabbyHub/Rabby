import { Modal } from '@/ui/component';
import React from 'react';
import { RevokeTable, RevokeTableProps } from './RevokeTable';
import { findIndexRevokeList } from '../../utils';

export const useBatchRevokeModal = ({
  revokeList,
  dataSource,
  ...props
}: RevokeTableProps) => {
  const [visible, setVisible] = React.useState(false);

  const show = React.useCallback(() => {
    setVisible(true);
  }, []);

  const filteredDataSource = React.useMemo(
    () =>
      dataSource.filter((record) => {
        return (
          findIndexRevokeList(revokeList, {
            item: record.$assetContract!,
            spenderHost: record.$assetToken!,
            assetApprovalSpender: record,
          }) > -1
        );
      }),
    [revokeList, dataSource]
  );

  const node = React.useMemo(() => {
    return (
      <Modal
        visible={visible}
        className="confirm-revoke-modal"
        closable={true}
        centered={true}
        width={964}
        okCancel={false}
        onCancel={() => setVisible(false)}
      >
        <RevokeTable
          {...props}
          dataSource={filteredDataSource}
          revokeList={revokeList}
        />
      </Modal>
    );
  }, [visible]);

  return {
    show,
    node,
  };
};
