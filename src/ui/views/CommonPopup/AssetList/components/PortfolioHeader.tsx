import React from 'react';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  .name {
    background: rgba(134, 151, 255, 0.1);
    border-radius: 10px;
    font-weight: 500;
    font-size: 12px;
    line-height: 14px;
    color: #8697ff;
    padding: 4px 6px;
  }
  .description {
    font-weight: 500;
    font-size: 12px;
    line-height: 14px;
    color: #13141a;
    margin-bottom: 0;
  }
  .net-worth {
    flex: 1;
    display: flex;
    justify-content: flex-end;
    align-items: center;
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
      <div className="flex items-center">
        <div className="name mr-6">{name}</div>
        {showDescription ? (
          <p className="description">
            {data?._originPortfolio?.detail?.description || ''}
          </p>
        ) : null}
      </div>
      <div className="net-worth text-13">
        <p>{data._netWorth}</p>
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
