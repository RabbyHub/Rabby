import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const Wraper = styled.div`
  background-color: transparent;
  min-height: auto;
  flex: 1;
  padding-top: 117px;
  .no-data-image {
    width: 100px;
    margin: 0 auto;
  }
`;

export const Emtpy = ({ description }: { description: string }) => {
  const { t } = useTranslation();
  return (
    <Wraper>
      <img
        className="no-data-image"
        src="/images/nodata-tx.png"
        alt="no address"
      />
      <p className="text-r-neutral-body text-14 text-center font-medium">
        {description}
      </p>
    </Wraper>
  );
};
