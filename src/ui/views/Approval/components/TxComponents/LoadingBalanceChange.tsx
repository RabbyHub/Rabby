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
    <div className="loading-balance-change">
      <div className="token-balance-change">
        <p className="section-title flex justify-between">
          <span>{t('token balance change')}</span>
        </p>
        <div className="gray-section-block token-balance-change-content">
          <div>
            <ul>
              <li>
                <Skeleton.Input active style={{ width: 156 }} />
              </li>
              <li>
                <Skeleton.Input active style={{ width: 156 }} />
              </li>
            </ul>
          </div>
          <div className="total-balance-change">
            <Skeleton.Input active style={{ width: 108 }} />
          </div>
        </div>
      </div>
      <div className="nft-bc">
        <p className="section-title flex justify-between">
          <span>{t('nft balance change')}</span>
        </p>
        <NFTBCContent className="gray-section-block nft-bc-content">
          <div className="w-[100%] flex justify-center align-items">
            {Array(NFT_SKE_COUNT)
              .fill(undefined)
              .map((_, idx) => {
                return (
                  <div key={`ske-nft-avatar-${idx}`} className="ske-nft-avatar">
                    <Skeleton.Avatar active shape="square" />
                  </div>
                );
              })}
          </div>
        </NFTBCContent>
      </div>
    </div>
  );
};

export default LoadingBalanceChange;
