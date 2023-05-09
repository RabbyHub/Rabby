export const useBrandNameHasWallet = (brandName: string) => {
  const hasWallet = /[wW]allet$/.test(brandName);

  return hasWallet;
};
