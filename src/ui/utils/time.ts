export const formatSeconds = (secs: number) => {
  if (secs < 60) return `${secs} sec`;
  const min = Math.floor(secs / 60);
  const s = secs - min * 60;

  return `${min} min${s > 0 ? ` ${s} sec` : ''}`;
};

export const timeago = (a: number, b: number) => {
  const bigger = Math.max(a, b);
  const less = Math.min(a, b);
  let secs = (bigger - less) / 1000;
  const hour = Math.floor(secs / 3600);
  secs = secs - hour * 3600;
  const minute = Math.floor(secs / 60);
  secs = secs - minute * 60;
  const second = secs;

  return {
    hour,
    minute,
    second,
  };
};
