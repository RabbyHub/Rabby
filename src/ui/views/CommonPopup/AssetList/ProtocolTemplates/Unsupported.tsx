import React from 'react';
import Card from '../components/Card';

import PortfolioHeader from '../components/PortfolioHeader';
import { AbstractPortfolio } from 'ui/utils/portfolio/types';
import styled from 'styled-components';

const UnSupportText = styled.p`
  margin-top: 10px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
`;

export default React.memo(
  ({ name, data }: { name: string; data: AbstractPortfolio }) => {
    return (
      <Card>
        <PortfolioHeader data={data} name={name} showDescription />
        <UnSupportText>Unsupported pool type</UnSupportText>
      </Card>
    );
  }
);
