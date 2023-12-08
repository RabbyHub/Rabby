import { useInterval } from 'ahooks';
import { useState } from 'react';
import { sinceTimeWithSecs } from '../utils';

export const useSinceTimeWithSecs = (unixTime?: number | null) => {
  const [result, setResult] = useState('');

  useInterval(() => {
    setResult(unixTime ? sinceTimeWithSecs(unixTime) : '');
  }, 1000);

  return result;
};
