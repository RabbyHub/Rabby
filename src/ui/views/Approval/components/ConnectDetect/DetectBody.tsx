import clsx from 'clsx';
import React from 'react';
import { FooterButtonContainer } from './FooterButtonContainer';
import { TYPE_VISIBLE_DECISIONS } from './ConnectDetect';
import { WarningChecklist } from './WarningChecklist';

interface DetectBodyProps {
  decision: TYPE_VISIBLE_DECISIONS;
  alert: string;
  onCancel: () => void;
  onContinue: () => void;
}

export const DetectBody: React.FC<DetectBodyProps> = ({
  decision,
  alert,
  onCancel,
  onContinue,
}) => {
  const isForbidden = decision === 'forbidden';
  const isWarning = decision === 'warning';
  const [isAllChecked, setIsAllChecked] = React.useState(false);

  return (
    <div
      className={clsx('flex flex-col h-full', {
        'pt-32': isForbidden,
        'pt-20': isWarning,
      })}
    >
      <div className="flex-1 px-20">
        <div className="text-gray-title text-15 leading-5 font-medium">
          {alert}
        </div>
        {isWarning && <WarningChecklist onChange={setIsAllChecked} />}
      </div>

      {isForbidden && <FooterButtonContainer onCancel={onCancel} />}

      {isWarning && isAllChecked && (
        <FooterButtonContainer onCancel={onContinue} text="Continue" />
      )}
    </div>
  );
};
