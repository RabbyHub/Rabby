export const getAmountText = (amount: number | string) => {
  return +amount > 1 ? `${amount} NFTs` : `${amount || 0} NFT`;
};
