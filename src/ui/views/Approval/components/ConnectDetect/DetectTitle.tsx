import { FallbackSiteLogo } from '@/ui/component';
import clsx from 'clsx';
import React from 'react';
import { ConnectDetectProps, TYPE_VISIBLE_DECISIONS } from './ConnectDetect';

interface DetectTitleProps extends ConnectDetectProps {
  decision: TYPE_VISIBLE_DECISIONS;
}

export const DetectTitle: React.FC<DetectTitleProps> = ({
  decision,
  origin,
  icon,
}) => {
  const isForbidden = decision === 'forbidden';
  const isWarning = decision === 'warning';

  return (
    <div
      className={clsx('overflow-hidden rounded-t-2xl pt-16 h-80', {
        'bg-red-forbidden': isForbidden,
        'bg-orange': isWarning,
      })}
    >
      <h1 className="text-white text-15 font-bold">
        {isForbidden ? 'Phishing site detected, unable to connect' : ''}
        {isWarning
          ? 'Potential phishing site detected, connection blocked'
          : ''}
      </h1>

      <div className="inline-flex mt-6 px-8 py-6 bg-[#00000020] text-white text-13 leading-[1.15] rounded-sm">
        <FallbackSiteLogo url={icon} origin={origin} width="15px" />
        <div className="ml-6">{origin}</div>
      </div>
    </div>
  );
};
