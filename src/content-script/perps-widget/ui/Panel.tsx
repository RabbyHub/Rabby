/** Panel body — top-3 cards + footer (Pro Mode link, hide button). Rendered below the header. */

import React from 'react';
import { PerpsLiveSnapshot } from '@/utils/message/perpsLive';
import { PositionCard } from './PositionCard';
import { STRINGS } from './strings';
import { openInDesktopPerps } from './wallet';

const TOP_N = 3;

/** Eye-with-slash-rays mark for the hide action. */
const HideIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
  >
    <path
      d="M2.26904 5.59998C2.47433 5.99433 2.78538 6.36016 3.182 6.6852C4.29402 7.59658 6.07868 8.18739 8.09072 8.18739C10.1028 8.18739 11.8874 7.59658 12.9994 6.6852C13.396 6.36016 13.7071 5.99433 13.9124 5.59998"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.70898 8.1908L10.3786 10.69"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.416 7.3324L14.2456 9.16196"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M1.95923 9.16196L3.78879 7.3324"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.80396 10.69L6.47364 8.1908"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface PanelProps {
  snapshot: PerpsLiveSnapshot | null;
  onHide: () => void;
}

const PanelImpl: React.FC<PanelProps> = ({ snapshot, onHide }) => {
  const positions = snapshot?.positions;
  const { top, hiddenCount } = React.useMemo(() => {
    const sorted = [...(positions ?? [])].sort(
      (a, b) =>
        Math.abs(Number(b.positionValue || 0)) -
        Math.abs(Number(a.positionValue || 0))
    );
    return {
      top: sorted.slice(0, TOP_N),
      hiddenCount: Math.max(0, sorted.length - TOP_N),
    };
  }, [positions]);

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

      <div className="rabby-perps-widget__footer">
        <span
          className="rabby-perps-widget__footer-text"
          onClick={handleFooterClick}
        >
          {STRINGS.footerLink(hiddenCount)}
        </span>
        <span
          className="rabby-perps-widget__hide"
          role="button"
          aria-label={STRINGS.hideWidget}
          onClick={onHide}
        >
          <HideIcon />
          <span className="rabby-perps-widget__hide-tip">
            {STRINGS.hideWidget}
          </span>
        </span>
      </div>
    </div>
  );
};
export const Panel = React.memo(PanelImpl);
