import React from 'react';
import { Skeleton } from 'antd';
import { Trans } from 'react-i18next';
import { CHAINS, CHAINS_ENUM } from 'consts';
import LoadingBalanceChange from './LoadingBalanceChange';

interface SignProps {
  chainEnum: CHAINS_ENUM;
}

const Loading = ({ chainEnum }: SignProps) => {
  const chain = CHAINS[chainEnum];

  return (
    <div className="sign">
      <p className="section-title">
        <Trans
          i18nKey="signTransactionWithChain"
          values={{ name: chain.name }}
        />
      </p>
      <div className="gray-section-block common-detail-block">
        <div className="block-field">
          <Skeleton.Input active style={{ width: 200 }} />
        </div>
        <div className="block-field">
          <Skeleton.Input active style={{ width: 200 }} />
        </div>
        <div className="block-field contract">
          <Skeleton.Input active style={{ width: 120 }} />
        </div>
      </div>
      <LoadingBalanceChange />
    </div>
  );
};

export default Loading;
