import React from 'react';
import { useTranslation } from 'react-i18next';

import { CELL_WIDTH } from './Cell';

export const ListHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="px-[12px] pt-[5px] flex items-center gap-[8px]">
      <div style={{ width: CELL_WIDTH.ASSET }}>
        <span className="text-[12px] leading-[14px] font-normal text-r-neutral-foot">
          {t('page.manageBatchApprovals.cols.asset')}
        </span>
      </div>
      <div style={{ width: CELL_WIDTH.REVOKE_FROM }}>
        <span className="text-[12px] leading-[14px] font-normal text-r-neutral-foot">
          {t('page.manageBatchApprovals.cols.revokeFrom')}
        </span>
      </div>
      <div style={{ width: CELL_WIDTH.GAS_FEE }} className="text-right">
        <span className="text-[12px] leading-[14px] font-normal text-r-neutral-foot">
          {t('page.manageBatchApprovals.cols.gasFee')}
        </span>
      </div>
    </div>
  );
};
