import type { useHistory, useLocation } from 'react-router-dom';

type History = ReturnType<typeof useHistory>;
type Location = ReturnType<typeof useLocation>;

export const perpsSpotPaths = {
  markets: '/perps/spot',
  portfolio: '/perps/spot/portfolio',
  trade: (pairIndex: number, side?: 'buy' | 'sell') =>
    `/perps/spot/trade/${pairIndex}${side ? `?side=${side}` : ''}`,
};

type PerpsSpotLocationState = { fromPerps?: boolean } | undefined;

/** Open the spot markets from the Perps page, remembering where we came from. */
export const openPerpsSpotMarkets = (history: History) => {
  history.push(perpsSpotPaths.markets, { fromPerps: true });
};

/**
 * Back to Perps: pop the spot page when Perps is right below it, otherwise
 * replace it so Back doesn't bounce between the two.
 */
export const leavePerpsSpot = (history: History, location: Location) => {
  if ((location.state as PerpsSpotLocationState)?.fromPerps) {
    history.goBack();
    return;
  }
  history.replace('/perps');
};
