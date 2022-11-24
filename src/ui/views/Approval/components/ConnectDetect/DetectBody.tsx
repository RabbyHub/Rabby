import clsx from 'clsx';
import React from 'react';
import { FooterButtonContainer } from './FooterButtonContainer';
import { TYPE_VISIBLE_DECISIONS } from './ConnectDetect';
import { QUESTION_IDS, WarningRadioGroup } from './WarningRadioGroup';

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
  const contentContainerRef = React.useRef<HTMLDivElement>(null);
  const [selected, setSelected] = React.useState<QUESTION_IDS>();

  const handleChecklist = (s: QUESTION_IDS) => {
    setSelected(s);
    // scroll to bottom
    setTimeout(() => {
      contentContainerRef.current?.scrollTo({
        top: contentContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 0);
  };

  return (
    <div
      className={clsx('flex flex-col h-full overflow-hidden', {
        'pt-32': isForbidden,
        'pt-20': isWarning,
      })}
    >
      <div
        className={clsx('px-20 overflow-auto', { 'flex-1': isForbidden })}
        ref={contentContainerRef}
      >
        <div className="text-gray-title text-15 leading-5 font-medium">
          {alert}
        </div>
        {isWarning && <WarningRadioGroup onChange={handleChecklist} />}
      </div>

      {(isForbidden || (isWarning && selected === 'cancel')) && (
        <FooterButtonContainer onCancel={onCancel} />
      )}

      {isWarning && selected === 'continue' && (
        <FooterButtonContainer onCancel={onContinue} text="Continue" />
      )}
    </div>
  );
};
