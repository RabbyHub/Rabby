export const addHexPrefix = (str) => {
  if (typeof str !== 'string' || str.match(/^-?0x/u)) {
    return str;
  }

  return str.replace(/^(-)?(0x)?(.+)$/iu, (m, p1, p2, p3) => `${p1 || ''}0x${p3}`);
};
