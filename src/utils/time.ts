import { isNil } from 'lodash';

export const calcGasEstimated = (seconds?: number) => {
  if (isNil(seconds)) {
    return undefined;
  }
  // < 1 minute: ~ time sec
  // > 1 minute: ~ time min
  // >= 30 minutes: > 30 min
  if (seconds < 60) {
    return `~${Math.round(seconds)} sec`;
  }
  const minutes = seconds / 60;
  if (minutes < 30) {
    return `~${Math.round(minutes)} min`;
  }
  return '>30 min';
};
