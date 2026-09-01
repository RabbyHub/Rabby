import type {
  CollectionList,
  NFTItem,
} from '@rabby-wallet/rabby-api/dist/types';

type NftMedia = Pick<NFTItem, 'content'> & {
  content_type?: NFTItem['content_type'] | null;
};
type NftCollectionMedia = Pick<CollectionList, 'logo_url'>;

export const resolveNftDisplayMedia = (
  nft?: NftMedia,
  collection?: NftCollectionMedia
) => {
  const content = nft?.content || collection?.logo_url;

  return {
    content,
    type: nft?.content_type || (content ? 'image_url' : undefined),
  };
};
