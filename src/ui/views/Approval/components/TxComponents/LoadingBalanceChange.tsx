import React from 'react';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const NFT_SKE_COUNT = 6;
const NFTBCContent = styled.div`
  padding: 12px 16px;
  .ske-nft-avatar {
    flex-shrink: 0;
    width: ${(1 / NFT_SKE_COUNT) * 100}%;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    padding-right: 8px;
  }
  .ant-skeleton-avatar {
    border-radius: 4px;
    width: 48px;
    height: 48px;
  }
  .total-balance-change {
    display: flex;
    justify-content: space-between;
    padding: 16px 0 0;
  }
`;

const LoadingBalanceChange = () => {
  const { t } = useTranslation();
  return (
    <div className="loading-balance-change p-[16px] mb-0">
      <p className="section-title flex justify-between">
        <span>{t('page.signTx.balanceChange.successTitle')}</span>
      </p>
      <div>
        <div className="flex items-center gap-[12px] mb-[12px]">
          <Skeleton.Avatar active style={{ width: 28, height: 28 }} />
          <Skeleton.Input active style={{ width: 120, height: 17 }} />
        </div>
        <div className="flex items-center gap-[12px]">
          <Skeleton.Avatar active style={{ width: 28, height: 28 }} />
          <Skeleton.Input active style={{ width: 120, height: 17 }} />
        </div>
      </div>
    </div>
  );
};

export default LoadingBalanceChange;
