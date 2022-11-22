import { Popup } from '@/ui/component';
import { usePhishDetect } from '@/ui/hooks/usePhishDetect';
import React from 'react';
import { DetectBody } from './DetectBody';
import { DetectTitle } from './DetectTitle';

export interface ConnectDetectProps {
  origin: string;
  icon: string;
  onCancel?(): void;
  onContinue?(): void;
}

export const VISIBLE_DECISIONS = ['forbidden', 'warning'] as const;
export type TYPE_VISIBLE_DECISIONS = typeof VISIBLE_DECISIONS[number];

export const ConnectDetect: React.FC<ConnectDetectProps> = (props) => {
  const { origin, onCancel, onContinue } = props;
  const { decision, alert } = usePhishDetect(origin);
  const [visible, setVisible] = React.useState(true);
  const d = decision as TYPE_VISIBLE_DECISIONS;

  if (!VISIBLE_DECISIONS.includes(d)) {
    return null;
  }

  return (
    <Popup
      className="connect-detect-popup"
      visible={visible}
      title={<DetectTitle decision={d} {...props} />}
      height="340"
    >
      <DetectBody
        decision={d}
        alert={alert}
        onCancel={() => {
          setVisible(false);
          onCancel?.();
        }}
        onContinue={() => {
          setVisible(false);
          onContinue?.();
        }}
      />
    </Popup>
  );
};
