const SECONDS_PER_MINUTE = 60;
const DURATION_ORANGE_MINUTES = 3;
const DURATION_RED_MINUTES = 10;

export const BRIDGE_DURATION_FAST_COLOR = {
  quote: 'text-r-neutral-foot',
  detail: 'text-r-neutral-title-1',
} as const;

const getBridgeDurationMinutes = (durationSeconds = 0) =>
  Math.max(Math.round(durationSeconds / SECONDS_PER_MINUTE), 1);

export const formatBridgeDuration = (
  durationSeconds: number | undefined,
  t: (key: string, options: { duration: number }) => string
) => {
  const seconds = durationSeconds || 0;
  if (seconds < SECONDS_PER_MINUTE) {
    return t('page.bridge.duration-sec', {
      duration: Math.max(Math.round(seconds), 1),
    });
  }
  return t('page.bridge.duration', {
    duration: getBridgeDurationMinutes(seconds),
  });
};

export const getBridgeDurationColor = (
  durationSeconds: number | undefined,
  fastColor: string = BRIDGE_DURATION_FAST_COLOR.quote
) => {
  const minutes = getBridgeDurationMinutes(durationSeconds || 0);
  if (minutes > DURATION_RED_MINUTES) {
    return 'text-r-red-default';
  }
  if (minutes > DURATION_ORANGE_MINUTES) {
    return 'text-r-orange-default';
  }
  return fastColor;
};
