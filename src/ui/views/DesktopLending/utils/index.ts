import { HF_COLOR_BAD_THRESHOLD, HF_COLOR_GOOD_THRESHOLD } from './constant';

// TODO： 这里有改动适配，看看对不对
export const getHealthStatusColor = (healthFactor: number) => {
  if (healthFactor === undefined || healthFactor < 0) {
    // 一般不会走到这
    return {
      color: 'transparent',
      backgroundColor: 'transparent',
    };
  }
  if (healthFactor < HF_COLOR_BAD_THRESHOLD) {
    return {
      color: 'var(--rb-red-default)',
      textColor: 'white',
      backgroundColor: 'var(--rb-red-light-1)',
    };
  }
  if (healthFactor < HF_COLOR_GOOD_THRESHOLD) {
    return {
      color: 'var(--rb-orange-default)',
      textColor: 'white',
      backgroundColor: 'var(--rb-orange-light-1)',
    };
  }
  return {
    color: 'var(--rb-green-default)',
    textColor: 'var(--rb-green-default)',
    backgroundColor: 'var(--rb-green-light-1)',
  };
};

export const isHFEmpty = (healthFactor?: number) => {
  return !healthFactor || healthFactor <= 0;
};
