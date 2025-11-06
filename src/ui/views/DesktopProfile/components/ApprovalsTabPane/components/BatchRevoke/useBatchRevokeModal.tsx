import { Modal } from '@/ui/component';
import React from 'react';
import { RevokeTable, RevokeTableProps } from './RevokeTable';
import { findIndexRevokeList } from '../../utils';
import { BatchRevokeTaskType } from './useBatchRevokeTask';

export const useBatchRevokeModal = ({
  revokeList,
  dataSource,
  isDesktop,
  ...props
}: Omit<RevokeTableProps, 'onTaskStatus'> & {
  isDesktop?: boolean;
}) => {
  const [visible, setVisible] = React.useState(false);
  const maskClosableRef = React.useRef(true);
  const needUpdateRef = React.useRef(false);

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

  const handleTaskStatus = React.useCallback(
    (status: BatchRevokeTaskType['status']) => {
      if (status === 'idle') {
        maskClosableRef.current = true;
        needUpdateRef.current = false;
      } else if (status === 'completed') {
        maskClosableRef.current = true;
        needUpdateRef.current = true;
      } else {
        maskClosableRef.current = false;
      }
    },
    []
  );

  const handleCancel = React.useCallback(() => {
    if (maskClosableRef.current) {
      setVisible(false);
      props.onClose(needUpdateRef.current);
    }
  }, []);

  const node = React.useMemo(() => {
    return (
      <Modal
        visible={visible}
        className="confirm-revoke-modal"
        closable={false}
        maskClosable={true}
        centered={true}
        width={964}
        okCancel={false}
        destroyOnClose
        onCancel={handleCancel}
        maskStyle={
          isDesktop
            ? {
                background: 'rgba(0, 0, 0, 0.30)',
                backdropFilter: 'blur(8px)',
              }
            : undefined
        }
      >
        <RevokeTable
          {...props}
          onTaskStatus={handleTaskStatus}
          dataSource={filteredDataSource}
          revokeList={revokeList}
          onDone={() => {
            props.onDone();
            setVisible(false);
          }}
          onClose={(_needUpdate) => {
            props.onClose(_needUpdate);
            setVisible(false);
          }}
        />
      </Modal>
    );
  }, [visible]);

  return {
    show,
    node,
  };
};
