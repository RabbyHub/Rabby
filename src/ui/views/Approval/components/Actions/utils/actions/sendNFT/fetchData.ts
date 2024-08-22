import { FetchActionRequiredData } from '../../types';
import { fetchDataSend } from '../send/fetchData';

export const fetchDataSendNFT: FetchActionRequiredData = async (options) => {
  if (options.type !== 'transaction') {
    return {};
  }
  const sendNFT = options.actionData.sendNFT;

  if (!sendNFT) {
    return {};
  }

  return await fetchDataSend(options, {
    to: sendNFT.to,
    token: {
      id: sendNFT.nft.contract_id,
      chain: options.chainId,
    },
  });
};
