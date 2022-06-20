import { connectStore, useRabbySelector } from '@/ui/store';
import { openInTab } from '@/ui/utils';
import clsx from 'clsx';
import React, { useCallback } from 'react';
import ReactGA from 'react-ga';

interface ExtraLinkProps {
  className?: string;
  address: string;
}

const ExtraLink = ({ className, address }: ExtraLinkProps) => {
  const currentAccount = useRabbySelector((s) => s.account.currentAccount);

  const handleDebankClick = useCallback(() => {
    ReactGA.event({
      category: 'ViewAssets',
      action: 'goToDebank',
      label: currentAccount?.brandName,
    });
    setTimeout(() => {
      openInTab(`https://debank.com/profile/${address}`);
    }, 200);
  }, [address]);
  const handleScanClick = useCallback(() => {
    ReactGA.event({
      category: 'ViewAssets',
      action: 'goToEtherscan',
      label: currentAccount?.brandName,
    });
    setTimeout(() => {
      openInTab(`https://etherscan.io/address/${address}`);
    }, 200);
  }, [address]);
  return (
    <div className={clsx('extra-link', className)}>
      <div className="extra-link-debank" onClick={handleDebankClick}></div>
      <div className="extra-link-divider"></div>
      <div className="extra-link-scan" onClick={handleScanClick}></div>
    </div>
  );
};

export default connectStore()(ExtraLink);
