import { ConnectedSite } from 'background/service/permission';
import { INTERNAL_REQUEST_ORIGIN } from 'consts';
import React from 'react';
import styled from 'styled-components';

const TransactionWebsiteWrapper = styled.a`
  font-weight: 400;
  font-size: 12px;
  line-height: 14px;
  color: #707280;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &:hover {
    color: #707280;
    text-decoration: underline;
  }
`;

export const TransactionWebsite = ({ site }: { site: ConnectedSite }) => {
  return site.origin === INTERNAL_REQUEST_ORIGIN ? (
    <span className="flex-1 whitespace-nowrap overflow-ellipsis overflow-hidden text-gray-light text-12">
      Rabby Wallet
    </span>
  ) : (
    <TransactionWebsiteWrapper
      href={site.origin}
      target="_blank"
      title={site.origin}
    >
      {site.origin}
    </TransactionWebsiteWrapper>
  );
};
