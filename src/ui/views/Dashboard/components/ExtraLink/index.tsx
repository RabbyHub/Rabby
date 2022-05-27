import { openInTab } from '@/ui/utils';
import clsx from 'clsx';
import React, { useCallback } from 'react';
import IconDucky from 'ui/assets/ducky-icon-square-yellow.svg';

interface ExtraLinkProps {
  className?: string;
  address: string;
}

const ExtraLink = ({ className, address }: ExtraLinkProps) => {
  // const handleDebankClick = useCallback(() => {
  //   openInTab(`https://debank.com/profile/${address}`);
  // }, [address]);
  // const handleScanClick = useCallback(() => {
  //   openInTab(`https://etherscan.io/address/${address}`);
  // }, [address]);
  const handleDuckyScanClick = useCallback(() => {
    openInTab(`https://www.duckyscan.com/address/${address}`);
  }, [address]);

  return (
    <>
      {/* <div className={clsx('extra-link', className)}>
      <div className="extra-link-debank" onClick={handleDebankClick}></div>
      <div className="extra-link-divider"></div>
      <div className="extra-link-scan" onClick={handleScanClick}></div>
    </div> */}
      <div className={clsx('extra-link', className)}>
        <button
          className="flex bg-white gap-2 rounded-full px-16 py-8"
          onClick={handleDuckyScanClick}
        >
          <img src={IconDucky} />
          DuckyScan
        </button>
      </div>
    </>
  );
};

export default ExtraLink;
