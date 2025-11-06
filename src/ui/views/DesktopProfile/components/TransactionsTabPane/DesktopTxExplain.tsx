import { TxDisplayItem, TxHistoryItem } from '@/background/service/openapi';
import React from 'react';
import { getTokenSymbol } from 'ui/utils/token';
import { useTranslation } from 'react-i18next';
import { NameAndAddress, TxAvatar } from '@/ui/component';

type TxInterAddressExplainProps = {
  data: TxDisplayItem | TxHistoryItem;
} & Pick<TxDisplayItem, 'cateDict' | 'projectDict' | 'tokenDict'>;

export const DesktopTxExplain = ({
  data,
  projectDict,
  tokenDict,
  cateDict,
}: TxInterAddressExplainProps) => {
  const isCancel = data.cate_id === 'cancel';
  const isApprove = data.cate_id === 'approve';
  const project = data.project_id ? projectDict[data.project_id] : null;
  const { t } = useTranslation();

  const projectName = (
    <span>
      {project?.name ? (
        project.name
      ) : data.other_addr ? (
        <NameAndAddress
          className="justify-start"
          nameClass="text-[14px] leading-[17px] font-normal"
          copyIconClass="w-[14px] h-[14px]"
          address={data.other_addr}
          copyIcon={!data.is_scam}
        />
      ) : (
        ''
      )}
    </span>
  );

  let interAddressExplain;

  if (isCancel) {
    interAddressExplain = (
      <div className="text-[14px] leading-[17px] text-r-neutral-title1">
        {t('page.transactions.explain.cancel')}
      </div>
    );
  } else if (isApprove) {
    const tokenId = data.token_approve?.token_id || '';
    const tokenUUID = `${data.chain}_token:${tokenId}`;

    const approveToken = tokenDict[tokenId] || tokenDict[tokenUUID];

    const amount = data.token_approve?.value || 0;

    // todo: translate
    interAddressExplain = (
      <div className="text-[14px] leading-[17px] text-r-neutral-title1">
        Approve {amount < 1e9 ? amount.toFixed(4) : 'infinite'}{' '}
        {`${getTokenSymbol(approveToken)} for `}
        {projectName}
      </div>
    );
  } else {
    interAddressExplain = (
      <>
        <div className="text-[14px] leading-[17px] text-r-neutral-title1">
          {cateDict[data.cate_id || '']?.name ??
            (data.tx?.name || t('page.transactions.explain.unknown'))}
        </div>
        <div className="tx-explain-desc">{projectName}</div>
      </>
    );
  }

  return (
    <div className="flex items-center gap-[8px]">
      <TxAvatar
        src={projectDict[data.project_id as string]?.logo_url}
        cateId={data.cate_id}
        className="w-[32px] h-[32px] rounded-[4px]"
      ></TxAvatar>
      <div className="flex flex-col gap-[6px]">{interAddressExplain}</div>
    </div>
  );
};
