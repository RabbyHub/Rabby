import IconCheck from '@/ui/assets/pending/icon-check-1.svg';
import IconClock from '@/ui/assets/pending/icon-clock.svg';
import iconSpin from '@/ui/assets/pending/icon-spin-1.svg';
import {
  MempoolCheckDetail,
  TxRequest,
} from '@rabby-wallet/rabby-api/dist/types';
import { Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import React, { useMemo } from 'react';
import { Empty } from '../Empty';
import { Loading } from './Loading';
import { useTranslation } from 'react-i18next';

export const MempoolList = ({
  list,
  loading,
  txRequest,
}: {
  list?: MempoolCheckDetail[];
  txRequest?: TxRequest;
  loading?: boolean;
}) => {
  const { t } = useTranslation();

  const columns: ColumnsType<MempoolCheckDetail> = [
    {
      title: <div className="text-r-neutral-foot">#</div>,
      width: 112,
      render(value, record, index) {
        return <div className="text-r-neutral-foot">{index + 1}</div>;
      },
    },

    {
      title: t('page.pendingDetail.MempoolList.col.nodeName'),
      width: 294,
      render(value, record, index) {
        return (
          <div className="font-medium text-r-neutral-title-1">
            {record.name}
          </div>
        );
      },
    },

    {
      title: t('page.pendingDetail.MempoolList.col.nodeOperator'),
      width: 348,
      render(value, record, index) {
        return (
          <div className="font-medium text-r-neutral-title-1">
            {record.operator}
          </div>
        );
      },
    },
    // {
    //   title: 'Node 24h packed percentage ',
    //   width: 220,
    //   render(value, record, index) {
    //     return (
    //       <div className="flex items-center gap-[16px]">
    //         <div className="w-[80px] bg-r-neutral-line h-[3px] rounded-[2px]">
    //           <div
    //             style={{
    //               width: (record.packed_rate || 0) * 100 + '%',
    //             }}
    //             className="bg-r-blue-default h-[3px] rounded-[2px] opacity-50"
    //           ></div>
    //         </div>
    //         <div className="font-medium text-r-neutral-foot">
    //           {((record.packed_rate || 0) * 100).toFixed(2)}%
    //         </div>
    //       </div>
    //     );
    //   },
    // },

    {
      title: t('page.pendingDetail.MempoolList.col.txStatus'),
      render(value, record, index) {
        return (
          <div>
            {record.check_success ? (
              <div className="flex items-center gap-[6px] font-medium text-r-blue-default">
                <img src={IconCheck} alt="" />
                {t('page.pendingDetail.MempoolList.txStatus.appeared')}
              </div>
            ) : null}
            {record.check_success === false ? (
              <div className="flex items-center gap-[6px] text-r-neutral-body">
                <img src={IconClock} alt="" />
                {t('page.pendingDetail.MempoolList.txStatus.appearedOnce')}
              </div>
            ) : null}
            {record.check_success == null ? (
              <div className="flex items-center gap-[6px] text-r-neutral-foot">
                <img src={iconSpin} alt="" className="animate-spin" />
                {t('page.pendingDetail.MempoolList.txStatus.notFound')}
              </div>
            ) : null}
          </div>
        );
      },
    },
  ];

  const appearedCount = useMemo(
    () => list?.filter((item) => item.check_success).length || 0,
    [list]
  );

  const isEmpty = !list?.length;

  return (
    <div className="card">
      <div className="flex items-center mb-[8px]">
        <div className="card-title">
          {t('page.pendingDetail.MempoolList.title', {
            count: appearedCount,
          })}
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : (
        <div>
          {!isEmpty ? (
            <Table
              className="simple-table"
              columns={columns}
              dataSource={list}
              pagination={false}
              rowKey={(item) => item.rpc}
            ></Table>
          ) : (
            <Empty />
          )}
        </div>
      )}
    </div>
  );
};
