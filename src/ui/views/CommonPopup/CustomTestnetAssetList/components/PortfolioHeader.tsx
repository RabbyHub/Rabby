import React from 'react';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  align-items: start;
  margin-bottom: 16px;
  .name {
    background: var(--r-blue-light-1, #eef1ff);
    border-radius: 10px;
    font-weight: 500;
    font-size: 12px;
    line-height: 14px;
    color: var(--r-blue-default, #7084ff);
    padding: 4px 6px;
  }
  .description {
    font-weight: 500;
    font-size: 12px;
    line-height: 14px;
    color: var(--r-neutral-title-1, #192945);
    margin-bottom: 0;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
  }
  .net-worth {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    color: var(--r-neutral-title-1, #192945);
  }
`;
const PortfolioHeader = ({
  data,
  name,
  showDescription,
  showHistory,
}: {
  data: AbstractPortfolio;
  name: string;
  showDescription?: boolean;
  showHistory?: boolean;
}) => {
  return (
    <Wrapper>
      <div className="flex items-center flex-1 overflow-hidden">
        <div className="name mr-6">{name}</div>
        {showDescription ? (
          <p className="description">
            {data?._originPortfolio?.detail?.description || ''}
          </p>
        ) : null}
      </div>
      <div className="net-worth text-13">
        <span>{data._netWorth}</span>
        {showHistory ? (
          <span>
            {data._netWorthChange !== '-'
              ? `${data._changePercentStr} (${data._netWorthChange})`
              : '-'}
          </span>
        ) : null}
      </div>
    </Wrapper>
  );
};

export default PortfolioHeader;
