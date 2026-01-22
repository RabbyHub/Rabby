import React from 'react';
import { HeadlineStyled } from '../TxComponents/BalanceChange';
import { useTranslation } from 'react-i18next';
import { Skeleton } from 'antd';

export const BalanceChangeLoading = () => {
  const { t } = useTranslation();
  return (
    <div className="token-balance-change">
      <HeadlineStyled>
        <span>{t('page.signTx.balanceChange.successTitle')}</span>
      </HeadlineStyled>
      <div className="flex items-center gap-8">
        <Skeleton.Avatar size={24} active shape="circle" />
        <Skeleton.Input
          style={{
            width: 100,
            height: 16,
            borderRadius: 4,
          }}
          active
        />
      </div>
    </div>
  );
};
