/**
 * @description compare address is same, ignore case
 */
export const isSameAddress = (a: string, b: string) => {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
};
