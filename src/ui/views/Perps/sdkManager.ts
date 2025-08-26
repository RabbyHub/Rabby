import { HyperliquidSDK } from '@rabby-wallet/hyperliquid-sdk';

let sdkInstance: HyperliquidSDK | null = null;
let currentMasterAddress: string | null = null;

// interface InitPerpsSDKParams {
//   masterAddress: string;
//   agentPrivateKey: string;
//   agentPublicKey: string;
//   agentName: string;
// }

// export const initPerpsSDK = (params: InitPerpsSDKParams) => {
//   const { masterAddress, agentPrivateKey, agentPublicKey, agentName } = params;
//   if (
//     sdkInstance &&
//     currentMasterAddress &&
//     currentMasterAddress.toLowerCase() === masterAddress.toLowerCase()
//   ) {
//     (window as any).__HyperliquidSDK = sdkInstance;
//     return sdkInstance;
//   }

//   if (sdkInstance) {
//     sdkInstance.ws?.disconnect();
//   }

//   sdkInstance = new HyperliquidSDK({
//     masterAddress,
//     agentPrivateKey,
//     agentPublicKey,
//     agentName,
//   });
//   // connect when subscribe
//   // sdkInstance.ws.connect();
//   currentMasterAddress = masterAddress;
//   (window as any).__HyperliquidSDK = sdkInstance;
//   return sdkInstance;
// };

export const getPerpsSDK = () => {
  if (!sdkInstance) {
    sdkInstance = new HyperliquidSDK({
      isTestnet: false,
      timeout: 10000,
    });
    return sdkInstance;
  }

  return sdkInstance;
};

export const destroyPerpsSDK = () => {
  sdkInstance?.ws.disconnect();
  sdkInstance = null;
  currentMasterAddress = null;
};
