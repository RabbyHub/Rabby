import { CollectionList } from '@rabby-wallet/rabby-api/dist/types';

export const commonCollectionsFilter = (collections: CollectionList[]) => {
  return collections.filter((collection) => {
    // 明确标记的才处理
    if (collection.is_verified === false) {
      return false;
    }
    return true;
  });
};
