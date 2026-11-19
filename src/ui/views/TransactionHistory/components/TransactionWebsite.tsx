import { ConnectedSite } from 'background/service/permission';
import { INTERNAL_REQUEST_ORIGIN } from 'consts';
import React from 'react';

export const TransactionWebsite = ({ site }: { site: ConnectedSite }) => {
  return site.origin === INTERNAL_REQUEST_ORIGIN ? (
    <span className="flex-1 whitespace-nowrap text-ellipsis overflow-hidden text-r-neutral-foot text-12">
      Rabby Wallet
    </span>
  ) : (
    <a
      className="font-normal text-12 text-r-neutral-foot flex-1 overflow-hidden text-ellipsis whitespace-nowrap hover:text-r-neutral-foot hover:underline"
      href={site.origin}
      target="_blank"
      rel="noopener noreferrer"
      title={site.origin}
    >
      {site.origin}
    </a>
  );
};
