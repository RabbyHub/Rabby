// Cross-mount scroll state for the popup Perps home so back-navigation
// from a child route (e.g. /perps/single-coin/...) restores the position.
//
// Lives outside the React tree on purpose — `<Perps/>` unmounts on every
// navigation, so its `useState`/`useRef` would be wiped.

let savedScrollTop = 0;
let resetOnNextRestore = false;

export const getSavedHomeScrollTop = () => savedScrollTop;

export const setSavedHomeScrollTop = (n: number) => {
  savedScrollTop = n;
};

/**
 * Signal that the next mount of the home should NOT restore the saved
 * position (e.g. after opening a position, we want the user to land at
 * the top to see their new fill in the Positions section).
 */
export const markHomeScrollResetOnNextRestore = () => {
  resetOnNextRestore = true;
};

/**
 * Returns the pending reset flag and clears it. Single-use per mount.
 */
export const consumeHomeScrollResetFlag = (): boolean => {
  const v = resetOnNextRestore;
  resetOnNextRestore = false;
  return v;
};
