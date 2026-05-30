import { CACHE_VALID_DURATION, NFT_SYNC_SCENE } from '../constants';
import { syncDbService } from '../services/syncDbService';

export const expiredNft = async (address: string) => {
  if (!address) {
    return;
  }
  return syncDbService.setUpdatedAt({
    address: address,
    scene: NFT_SYNC_SCENE,
    updatedAt: Date.now() - CACHE_VALID_DURATION,
  });
};
