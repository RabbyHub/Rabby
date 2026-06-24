import { HyperliquidSDK } from '@rabby-wallet/hyperliquid-sdk';
import { KEYRING_CLASS } from '@/constant';
import type { Account } from '@/background/service/preference';
import type { WalletControllerType } from '@/ui/utils/WalletContext';
import { PERPS_AGENT_NAME } from './constants';

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

// Separate SDK instance for BBO L2Book subscription
// Avoids message routing conflicts when main SDK subscribes to a different aggregation level
let bboSdkInstance: HyperliquidSDK | null = null;

export const getBboSDK = () => {
  if (!bboSdkInstance) {
    bboSdkInstance = new HyperliquidSDK({
      isTestnet: false,
      timeout: 10000,
    });
  }
  return bboSdkInstance;
};

export const destroyBboSDK = () => {
  bboSdkInstance?.ws.disconnect();
  bboSdkInstance = null;
};

export const isSelfSignPerpsAccount = (type?: string) =>
  type === KEYRING_CLASS.PRIVATE_KEY || type === KEYRING_CLASS.MNEMONIC;

// Bind the SDK to an agent account. Clears any externalSign from a prior
// self-sign session first — it outranks the agent key and would otherwise sign
// with the old account's key.
export const initPerpsAgentAccount = (
  masterAddress: string,
  vault: string | undefined,
  agentAddress: string,
  agentName: string = PERPS_AGENT_NAME
) => {
  const sdk = getPerpsSDK();
  sdk.setExternalSign(undefined);
  sdk.initAccount(masterAddress, vault, agentAddress, agentName);
};

// externalSign callback: master signs each L1 action with its own keyring key
// (EIP-712 V4) — no agent wallet; silent for pk/mnemonic.
const makePerpsExternalSign = (
  account: Account,
  wallet: WalletControllerType
) => (typedData: any): Promise<string> =>
  wallet.signTypedData(account.type, account.address, typedData, {
    version: 'V4',
  });

// Configure the SDK signer: self-sign (pk/mnemonic) installs externalSign and
// uses no agent; other types fall back to the agent vault + approveAgent flow.
export const applyPerpsSigner = async (
  account: Account,
  wallet: WalletControllerType
) => {
  const sdk = getPerpsSDK();
  if (isSelfSignPerpsAccount(account.type)) {
    sdk.initAccount(
      account.address,
      undefined,
      account.address,
      PERPS_AGENT_NAME
    );
    sdk.setExternalSign(makePerpsExternalSign(account, wallet));
    return { agentAddress: account.address, isSelfSign: true, isCreate: false };
  }
  const {
    vault,
    agentAddress,
    isCreate,
  } = await wallet.getOrCreatePerpsAgentWallet(account.address);
  initPerpsAgentAccount(account.address, vault, agentAddress);
  return { agentAddress, isSelfSign: false, isCreate };
};
