import { HF_COLOR_BAD_THRESHOLD, HF_COLOR_GOOD_THRESHOLD } from './constant';

export const getHealthStatusColor = (healthFactor: number) => {
  if (healthFactor === undefined || healthFactor < 0) {
    // 一般不会走到这
    return {
      color: 'transparent',
      backgroundColor: 'transparent',
      tooltipBgColor: 'transparent',
      tooltipTextColor: 'transparent',
    };
  }
  if (healthFactor < HF_COLOR_BAD_THRESHOLD) {
    return {
      color: 'var(--rb-red-default)',
      textColor: 'white',
      backgroundColor: 'var(--rb-red-default)',
      tooltipBgColor: 'var(--rb-red-light-1)',
      tooltipTextColor: 'var(--rb-red-default)',
    };
  }
  if (healthFactor < HF_COLOR_GOOD_THRESHOLD) {
    return {
      color: 'var(--rb-orange-default)',
      textColor: 'white',
      backgroundColor: 'var(--rb-orange-default)',
      tooltipBgColor: 'var(--rb-orange-light-1)',
      tooltipTextColor: 'var(--rb-orange-default)',
    };
  }
  return {
    color: 'var(--rb-green-default)',
    textColor: 'var(--rb-green-default)',
    backgroundColor: 'var(--rb-green-light-1)',
    tooltipBgColor: 'black',
    tooltipTextColor: 'white',
  };
};

export const isHFEmpty = (healthFactor?: number) => {
  return !healthFactor || healthFactor <= 0;
};
