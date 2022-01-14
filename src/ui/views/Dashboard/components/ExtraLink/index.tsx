import { openInTab } from '@/ui/utils';
import clsx from 'clsx';
import React, { useCallback } from 'react';

interface ExtraLinkProps {
  className?: string;
  address: string;
}

const ExtraLink = ({ className, address }: ExtraLinkProps) => {
  const handleDebankClick = useCallback(() => {
    openInTab(`https://debank.com/profile/${address}`);
  }, [address]);
  const handleScanClick = useCallback(() => {
    openInTab(`https://etherscan.io/address/${address}`);
  }, [address]);
  return (
    <div className={clsx('extra-link', className)}>
      <div className="extra-link-debank" onClick={handleDebankClick}></div>
      <div className="extra-link-divider"></div>
      <div className="extra-link-scan" onClick={handleScanClick}></div>
    </div>
  );
};

export default ExtraLink;
