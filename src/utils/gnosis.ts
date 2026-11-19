export const normalizeSafeOperation = (operation: unknown): 0 | 1 => {
  if (operation === undefined) return 0;
  if (operation === 0 || operation === '0' || operation === '0x0') return 0;
  if (operation === 1 || operation === '1' || operation === '0x1') return 1;
  throw new Error('Invalid Safe transaction operation');
};
