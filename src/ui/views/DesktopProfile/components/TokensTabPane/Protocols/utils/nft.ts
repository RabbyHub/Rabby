import {
  NftCollection,
  PortfolioItemNft,
} from '@rabby-wallet/rabby-api/dist/types';
import groupBy from 'lodash/groupBy';

export const polyNfts = (nfts: PortfolioItemNft[]) => {
  const poly = groupBy(nfts, (n) => n.collection.id);
  return Object.values(poly).map((arr) => {
    const amount = arr.reduce((sum, n) => {
      sum += n.amount;
      return sum;
    }, 0);
    return { ...arr[0], amount };
  });
};

export const getCollectionDisplayName = (c?: NftCollection) =>
  c ? c.symbol || c.name : '';
