import React from 'react';
import { Skeleton } from 'antd';
import { Trans } from 'react-i18next';
import { CHAINS_ENUM } from 'consts';
import LoadingBalanceChange from './LoadingBalanceChange';
import { findChainByEnum } from '@/utils/chain';

interface SignProps {
  chainEnum: CHAINS_ENUM;
}

const Loading = ({ chainEnum }: SignProps) => {
  return (
    <div className="sign">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: findChainByEnum(chainEnum)?.name || '' }}
        />
      </p>
      <div className="action-card">
        <div className="common-detail-block mb-0 px-[16px] pt-[16px] pb-[20px]">
          <div className="flex items-center gap-[12px]">
            <Skeleton.Avatar active style={{ width: 40, height: 40 }} />
            <div>
              <div>
                <Skeleton.Input active style={{ width: 90, height: 17 }} />
              </div>
              <div>
                <Skeleton.Input active style={{ width: 70, height: 15 }} />
              </div>
            </div>
          </div>
        </div>
        <LoadingBalanceChange />
      </div>
    </div>
  );
};

export default Loading;
