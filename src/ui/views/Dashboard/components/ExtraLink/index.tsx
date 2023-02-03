import { connectStore, useRabbySelector } from '@/ui/store';
import { openInTab } from '@/ui/utils';
import { getKRCategoryByType } from '@/utils/transaction';
import clsx from 'clsx';
import React, { useCallback } from 'react';
import { matomoRequestEvent } from '@/utils/matomo-request';

interface ExtraLinkProps {
  className?: string;
  address: string;
}

const ExtraLink = ({ className, address }: ExtraLinkProps) => {
  const currentAccount = useRabbySelector((s) => s.account.currentAccount);

  const handleDebankClick = useCallback(() => {
    matomoRequestEvent({
      category: 'ViewAssets',
      action: 'goToDebank',
      label: [
        getKRCategoryByType(currentAccount?.type),
        currentAccount?.brandName,
      ].join('|'),
      transport: 'beacon',
    });
    setTimeout(() => {
      openInTab(`https://debank.com/profile/${address}?utm_source=rabby`);
    }, 200);
  }, [address, currentAccount]);
  const handleScanClick = useCallback(() => {
    matomoRequestEvent({
      category: 'ViewAssets',
      action: 'goToEtherscan',
      label: [
        getKRCategoryByType(currentAccount?.type),
        currentAccount?.brandName,
      ].join('|'),
      transport: 'beacon',
    });
    setTimeout(() => {
      openInTab(`https://etherscan.io/address/${address}`);
    }, 200);
  }, [address, currentAccount]);
  return (
    <div className={clsx('extra-link', className)}>
      <div className="extra-link-debank" onClick={handleDebankClick}></div>
      <div className="extra-link-divider"></div>
      <div className="extra-link-scan" onClick={handleScanClick}></div>
    </div>
  );
};

export default connectStore()(ExtraLink);
