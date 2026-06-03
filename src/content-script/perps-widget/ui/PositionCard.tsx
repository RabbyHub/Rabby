/** Single position card. Click anywhere on the card opens the Pro Perps tab focused on this coin. */

import React from 'react';
import { PerpsLivePosition } from '@/utils/message/perpsLive';
import { Sparkline } from './Sparkline';
import { STRINGS } from './strings';
import {
  formatPnl,
  formatMarkPrice,
  formatPercent,
  formatCoinName,
} from './format';
import { openInDesktopPerps } from './wallet';

interface PositionCardProps {
  position: PerpsLivePosition;
}

export const PositionCard: React.FC<PositionCardProps> = ({ position }) => {
  const pnlNumber = Number(position.unrealizedPnl);
  const isPnlPos = pnlNumber >= 0;
  const dayChangePos =
    position.dayChangePct != null && position.dayChangePct >= 0;

  const handleClick = (): void => {
    openInDesktopPerps(position.coin);
  };

  const handleImgError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    // Hide broken-image glyph; the layout absorbs the missing icon gracefully.
    (e.target as HTMLImageElement).style.visibility = 'hidden';
  };

  return (
    <div
      className="rabby-perps-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="rabby-perps-card__top">
        <div className="rabby-perps-card__top-left">
          <img
            className="rabby-perps-card__logo"
            src={position.logoUrl}
            alt=""
            onError={handleImgError}
          />
          <span className="rabby-perps-card__name">
            {formatCoinName(position.displayName)}
            <span className="rabby-perps-quoteAsset">
              /{position.quoteAsset}
            </span>
          </span>
          <span
            className={
              position.direction === 'long'
                ? 'rabby-perps-card__direction rabby-perps-card__direction-long'
                : 'rabby-perps-card__direction rabby-perps-card__direction-short'
            }
          >
            {position.direction} {position.leverage.value}x
          </span>
        </div>
        <div className="rabby-perps-card__top-right">
          <span className="rabby-perps-card__value">
            {formatMarkPrice(position.markPx)}
          </span>
          <span
            className={
              dayChangePos
                ? 'rabby-perps-card__change rabby-perps-card__change-pos'
                : 'rabby-perps-card__change rabby-perps-card__change-neg'
            }
          >
            {formatPercent(position.dayChangePct)}
          </span>
        </div>
      </div>
      <div className="rabby-perps-card__bottom">
        <div className="rabby-perps-card__pnl-block">
          <span className="rabby-perps-card__pnl-label">{STRINGS.pnl}</span>
          <span
            className={
              isPnlPos
                ? 'rabby-perps-card__pnl-value rabby-perps-card__change-pos'
                : 'rabby-perps-card__pnl-value rabby-perps-card__change-neg'
            }
          >
            {formatPnl(position.unrealizedPnl)}
          </span>
        </div>
        <Sparkline prices={position.sparkline} />
      </div>
    </div>
  );
};
