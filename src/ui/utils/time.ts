export const formatSeconds = (secs: number) => {
  if (secs < 60) return `${secs} s`;
  const min = Math.floor(secs / 60);
  const s = secs - min * 60;

  return `${min} min${s > 0 ? ` ${s} s` : ''}`;
};
