/** Panel body — top-3 cards + (when truncated) footer link. Rendered below the header. */

import React from 'react';
import { PerpsLiveSnapshot } from '@/utils/message/perpsLive';
import { PositionCard } from './PositionCard';
import { STRINGS } from './strings';
import { openInDesktopPerps } from './wallet';

const TOP_N = 3;

interface PanelProps {
  snapshot: PerpsLiveSnapshot | null;
}

export const Panel: React.FC<PanelProps> = ({ snapshot }) => {
  const positions = snapshot?.positions ?? [];
  const sorted = [...positions].sort(
    (a, b) =>
      Math.abs(Number(b.positionValue || 0)) -
      Math.abs(Number(a.positionValue || 0))
  );
  const top = sorted.slice(0, TOP_N);
  const hiddenCount = Math.max(0, sorted.length - TOP_N);

  const handleFooterClick = (): void => {
    openInDesktopPerps();
  };

  return (
    <div className="rabby-perps-widget__body">
      {top.length > 0 && (
        <div className="rabby-perps-widget__cards">
          {top.map((p) => (
            <PositionCard key={p.coin} position={p} />
          ))}
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="rabby-perps-widget__footer">
          <span
            className="rabby-perps-widget__footer-text"
            onClick={handleFooterClick}
          >
            {STRINGS.hiddenPositions(hiddenCount)}
          </span>
        </div>
      )}
    </div>
  );
};
