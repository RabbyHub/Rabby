import { createPersistStore } from 'background/utils';
import { getRandomBytesSync } from 'ethereum-cryptography/random.js';
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js';
import { bytesToHex, publicToAddress } from '@ethereumjs/util';
import { keyringService } from '.';
import { SendApproveParams } from '@rabby-wallet/hyperliquid-sdk';

export interface AgentWalletInfo {
  vault: string;
  preference: {
    agentAddress: string;
    approveSignatures: ApproveSignatures;
  };
}

export type ApproveSignatures = (SendApproveParams & {
  type: 'approveAgent' | 'approveBuilderFee';
})[];

export interface PerpsServiceStore {
  agentVaults: string; // encrypted JSON string of {[address: string]: string}
  agentPreferences: {
    [address: string]: {
      agentAddress: string;
      approveSignatures: ApproveSignatures;
    };
  };
  currentAddress: string;
  hasDoneNewUserProcess: boolean;
}
export interface PerpsServiceMemoryState {
  agentWallets: {
    // key is master wallet address
    [address: string]: AgentWalletInfo;
  };
  currentAddress: string;
}

class PerpsService {
  private store?: PerpsServiceStore;
  private memoryState: PerpsServiceMemoryState = {
    agentWallets: {},
    currentAddress: '',
  };

  init = async () => {
    this.store = await createPersistStore<PerpsServiceStore>({
      name: 'perps',
      template: {
        agentVaults: '',
        agentPreferences: {},
        currentAddress: '',
        hasDoneNewUserProcess: false,
      },
    });

    this.memoryState.agentWallets = {};
    this.memoryState.currentAddress = this.store?.currentAddress || '';
  };

  setHasDoneNewUserProcess = async (hasDone: boolean) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    this.store.hasDoneNewUserProcess = hasDone;
  };

  getHasDoneNewUserProcess = async () => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    return this.store.hasDoneNewUserProcess;
  };

  setSendApproveAfterDeposit = async (
    masterAddress: string,
    approveSignatures: ApproveSignatures
  ) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }

    if (!masterAddress) {
      console.error('masterAddress is required');
      return;
    }

    const normalizedAddress = masterAddress.toLowerCase();

    // Update store preferences
    const existingPreference = this.store.agentPreferences[
      normalizedAddress
    ] || {
      agentAddress: '',
      approveSignatures: [],
    };

    this.store.agentPreferences[normalizedAddress] = {
      ...existingPreference,
      approveSignatures,
    };

    // Update memory state if wallet exists
    if (this.memoryState.agentWallets[normalizedAddress]) {
      this.memoryState.agentWallets[
        normalizedAddress
      ].preference.approveSignatures = approveSignatures;
    }
  };

  getSendApproveAfterDeposit = async (masterAddress: string) => {
    const normalizedAddress = masterAddress.toLowerCase();
    const agentWallet = this.memoryState.agentWallets[normalizedAddress];

    if (!agentWallet) {
      console.error('agentWallet not found');
      return null;
    }

    return agentWallet.preference.approveSignatures;
  };

  unlockAgentWallets = async () => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    this.memoryState.currentAddress = this.store.currentAddress;

    // Decrypt and load agent vaults
    if (this.store.agentVaults) {
      const vaultsMap: {
        [address: string]: string;
      } = await keyringService.decryptWithPassword(
        this.store.agentVaults,
        true,
        'perps'
      );

      // Format data for memory state
      for (const masterAddress in vaultsMap) {
        const privateKey = vaultsMap[masterAddress];
        const preference = this.store.agentPreferences[masterAddress] || {
          agentAddress: '',
        };
        this.memoryState.agentWallets[masterAddress] = {
          vault: privateKey,
          preference: {
            ...preference,
            approveSignatures: preference.approveSignatures || [],
          },
        };
      }
    }
  };

  createAgentWallet = async (masterAddress: string) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    const privateKey = getRandomBytesSync(32);
    const publicKey = secp256k1.getPublicKey(privateKey, false);
    const agentAddress = bytesToHex(
      publicToAddress(publicKey, true)
    ).toLowerCase();
    this.addAgentWallet(masterAddress, bytesToHex(privateKey), {
      agentAddress,
      approveSignatures: [],
    });
    return { agentAddress, vault: bytesToHex(privateKey) };
  };

  addAgentWallet = async (
    masterAddress: string,
    vault: string,
    preference: AgentWalletInfo['preference']
  ) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }

    const normalizedAddress = masterAddress.toLowerCase();

    this.memoryState.agentWallets = {
      ...this.memoryState.agentWallets,
      [normalizedAddress]: {
        vault,
        preference,
      },
    };

    let vaultsMap: { [address: string]: string } = {};
    if (this.store.agentVaults) {
      vaultsMap = await keyringService.decryptWithPassword(
        this.store.agentVaults,
        true,
        'perps'
      );
    }

    vaultsMap[normalizedAddress] = vault;

    const encryptedVaults = await keyringService.encryptWithPassword(
      vaultsMap,
      true,
      'perps'
    );

    // Update store
    this.store.agentVaults = encryptedVaults;
    this.store.agentPreferences = {
      ...this.store.agentPreferences,
      [normalizedAddress]: {
        agentAddress: preference.agentAddress,
        approveSignatures: preference.approveSignatures,
      },
    };
  };

  getAgentWallet = async (address: string) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }

    const normalizedAddress = address.toLowerCase();

    return this.memoryState.agentWallets[normalizedAddress];
  };

  updateAgentWalletPreference = async (
    address: string,
    preference: AgentWalletInfo['preference']
  ) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }

    const normalizedAddress = address.toLowerCase();
    const existingPreference = this.store.agentPreferences[normalizedAddress];

    if (!existingPreference) {
      throw new Error(`Agent wallet not found for address: ${address}`);
    }

    this.store.agentPreferences = {
      ...this.store.agentPreferences,
      [normalizedAddress]: {
        agentAddress: preference.agentAddress,
        approveSignatures: preference.approveSignatures,
      },
    };

    if (this.memoryState.agentWallets[normalizedAddress]) {
      this.memoryState.agentWallets[normalizedAddress].preference = preference;
    }
  };

  updateCurrentAddress = async (address: string) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    this.store.currentAddress = address;
    this.memoryState.currentAddress = address;
  };

  getCurrentAddress = async () => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    return this.memoryState.currentAddress;
  };

  removeAgentWallet = async (address: string) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }

    const normalizedAddress = address.toLowerCase();

    let vaultsMap: { [address: string]: string } = {};
    if (this.store.agentVaults) {
      vaultsMap = await keyringService.decryptWithPassword(
        this.store.agentVaults,
        true,
        'perps'
      );
    }

    delete vaultsMap[normalizedAddress];

    const encryptedVaults = await keyringService.encryptWithPassword(
      vaultsMap,
      true,
      'perps'
    );

    this.store.agentVaults = encryptedVaults;
    const updatedPreferences = { ...this.store.agentPreferences };
    delete updatedPreferences[normalizedAddress];
    this.store.agentPreferences = updatedPreferences;

    const updatedMemoryWallets = { ...this.memoryState.agentWallets };
    delete updatedMemoryWallets[normalizedAddress];
    this.memoryState.agentWallets = updatedMemoryWallets;
  };

  hasAgentWallet = (address: string) => {
    if (!this.store) {
      return false;
    }

    const normalizedAddress = address.toLowerCase();
    return !!this.memoryState.agentWallets[normalizedAddress];
  };

  getAgentWalletPreference = (address: string) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }

    const normalizedAddress = address.toLowerCase();
    const preference = this.store.agentPreferences[normalizedAddress];

    if (!preference) {
      return null;
    }

    return preference;
  };
}

export default new PerpsService();
