import { HyperliquidSDK } from '@rabby-wallet/hyperliquid-sdk';

let sdkInstance: HyperliquidSDK | null = null;
let currentMasterAddress: string | null = null;

export type InitPerpsSDKParams = {
  masterAddress: string;
  agentPrivateKey: string;
  agentPublicKey: string;
  agentName: string;
};

export const initPerpsSDK = (params: InitPerpsSDKParams) => {
  const { masterAddress, agentPrivateKey, agentPublicKey, agentName } = params;
  if (
    sdkInstance &&
    currentMasterAddress &&
    currentMasterAddress.toLowerCase() === masterAddress.toLowerCase()
  ) {
    (window as any).__HyperliquidSDK = sdkInstance;
    return sdkInstance;
  }

  sdkInstance = new HyperliquidSDK({
    masterAddress,
    agentPrivateKey,
    agentPublicKey,
    agentName,
  });
  sdkInstance.ws.connect();
  currentMasterAddress = masterAddress;
  (window as any).__HyperliquidSDK = sdkInstance;
  return sdkInstance;
};

export const getPerpsSDK = () => {
  if (!sdkInstance) {
    console.warn('sdkInstance is not initialized, init use fake address');
    return initPerpsSDK({
      masterAddress: '',
      agentPrivateKey: '',
      agentPublicKey: '',
      agentName: '',
    });
  }

  return sdkInstance;
};

export const destroyPerpsSDK = () => {
  sdkInstance?.ws.disconnect();
  sdkInstance = null;
  currentMasterAddress = null;
};
