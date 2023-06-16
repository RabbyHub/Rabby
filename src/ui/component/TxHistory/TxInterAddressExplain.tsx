import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import React from 'react';
import { NameAndAddress } from '..';
import { getTokenSymbol } from 'ui/utils/token';
import { TxAvatar } from './TxAvatar';

type TxInterAddressExplainProps = {
  data: TxDisplayItem | TxHistoryItem;
} & Pick<TxDisplayItem, 'cateDict' | 'projectDict' | 'tokenDict'>;

export const TxInterAddressExplain = ({
  data,
  projectDict,
  tokenDict,
  cateDict,
}: TxInterAddressExplainProps) => {
  const isCancel = data.cate_id === 'cancel';
  const isApprove = data.cate_id === 'approve';
  const project = data.project_id ? projectDict[data.project_id] : null;

  const projectName = (
    <span>
      {project?.name ? (
        project.name
      ) : data.other_addr ? (
        <NameAndAddress address={data.other_addr} />
      ) : (
        ''
      )}
    </span>
  );

  let interAddressExplain;

  if (isCancel) {
    interAddressExplain = 'Canceled a pending transaction';
  } else if (isApprove) {
    const approveToken = tokenDict[data.token_approve?.token_id || ''];
    const amount = data.token_approve?.value || 0;

    interAddressExplain = (
      <div className="tx-explain-title">
        Approve {amount < 1e9 ? amount.toFixed(4) : 'infinite'}{' '}
        {`${getTokenSymbol(approveToken)} for `}
        {projectName}
      </div>
    );
  } else {
    interAddressExplain = (
      <>
        <div className="tx-explain-title">
          {cateDict[data.cate_id || '']?.name ??
            (data.tx?.name || 'Contract Interaction')}
        </div>
        <div className="tx-explain-desc">{projectName}</div>
      </>
    );
  }

  return (
    <div className="ui tx-explain">
      <TxAvatar
        src={projectDict[data.project_id as string]?.logo_url}
        cateId={data.cate_id}
        className="tx-icon"
      ></TxAvatar>
      <div className="tx-explain-body">{interAddressExplain}</div>
    </div>
  );
};
