import { Modal } from '@/ui/component';
import React from 'react';
import { RevokeTable, RevokeTableProps } from './RevokeTable';
import { findIndexRevokeList } from '../../utils';
import { ReactComponent as LoadingSVG } from '@/ui/assets/address/loading.svg';
import { useBatchRevokeTask } from './useBatchRevokeTask';
import { ApprovalSpenderItemToBeRevoked } from '@/utils-isomorphic/approve';
import { AssetApprovalSpender } from '@/utils/approval';
import { useTranslation } from 'react-i18next';

export const useBatchRevokeModal = ({
  revokeList,
  dataSource,
  ...props
}: RevokeTableProps & {
  revokeList: ApprovalSpenderItemToBeRevoked[];
  dataSource: AssetApprovalSpender[];
}) => {
  const [visible, setVisible] = React.useState(false);
  const task = useBatchRevokeTask();
  const { t } = useTranslation();

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

  React.useEffect(() => {
    task.init(filteredDataSource, revokeList);
  }, [filteredDataSource, revokeList]);

  const totalApprovals = React.useMemo(() => {
    return revokeList.length;
  }, [revokeList]);

  const revokedApprovals = React.useMemo(() => {
    return task.list.filter((item) => item.$status?.status === 'success')
      .length;
  }, [task.list]);

  const node = React.useMemo(() => {
    return (
      <Modal
        visible={visible}
        title={
          <div className="space-y-12">
            <div className="space-x-8 flex justify-center items-center">
              {task.status === 'active' && (
                <LoadingSVG className="text-r-blue-default" />
              )}
              <span>
                {t('page.approvals.revokeModal.batchRevoke')} (
                {revokedApprovals}/{totalApprovals})
              </span>
            </div>
            <div className="text-r-neutral-foot text-15 font-normal">
              {t('page.approvals.revokeModal.revoked')}{' '}
              {t('page.approvals.revokeModal.approvalCount', {
                count: revokedApprovals,
              })}
              丨{t('page.approvals.revokeModal.totalRevoked')}{' '}
              {t('page.approvals.revokeModal.approvalCount', {
                count: totalApprovals,
              })}
            </div>
          </div>
        }
        className="confirm-revoke-modal"
        closable={true}
        centered={true}
        width={964}
        okCancel={false}
        onCancel={() => setVisible(false)}
      >
        <RevokeTable {...props} task={task} />
      </Modal>
    );
  }, [visible]);

  return {
    show,
    node,
  };
};
