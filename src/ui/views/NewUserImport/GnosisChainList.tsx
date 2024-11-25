import { Chain } from '@/types/chain';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const Container = styled.div`
  .desc {
    text-align: left;
    font-weight: 400;
    font-size: 13px;
    line-height: 15px;
    color: var(--r-neutral-body, #3e495e);
    margin-bottom: 12px;
  }
  .chain-list {
    display: flex;
    flex-wrap: wrap;
    gap: 20px 12px;

    &-item {
      display: flex;
      align-items: center;
      gap: 6px;

      font-weight: 500;
      font-size: 13px;
      line-height: 15px;
      color: var(--r-neutral-title-1, #192945);

      .chain-logo {
        width: 20px;
        height: 20px;
        border-radius: 50%;
      }
    }
  }
`;

export const GnosisChainList = ({
  chainList,
  className,
}: {
  chainList?: Chain[];
  className?: string;
}) => {
  const { t } = useTranslation();
  return chainList?.length ? (
    <Container className={className}>
      <div className="desc">
        {t('page.importSafe.gnosisChainDesc', {
          count: chainList?.length,
        })}
      </div>
      <div className="chain-list">
        {chainList?.map((chain) => {
          return (
            <div className="chain-list-item" key={chain.id}>
              <img src={chain.logo} alt="" className="chain-logo" />
              {chain.name}
            </div>
          );
        })}
      </div>
    </Container>
  ) : null;
};
