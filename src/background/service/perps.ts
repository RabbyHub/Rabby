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
  };
}

export type ApproveData = (SendApproveParams & {
  type: 'approveAgent' | 'approveBuilderFee';
})[];

export interface PerpsServiceStore {
  agentVaults: string; // encrypted JSON string of {[address: string]: string}
  agentPreferences: {
    [address: string]: {
      agentAddress: string;
    };
  };
  currentAddress: string;
}
export interface PerpsServiceMemoryState {
  agentWallets: {
    // key is master wallet address
    [address: string]: AgentWalletInfo;
  };
  currentAddress: string;
  sendApproveAfterDepositObj: {
    [address: string]: ApproveData; // address is master address
  };
}

class PerpsService {
  private store?: PerpsServiceStore;
  private memoryState: PerpsServiceMemoryState = {
    agentWallets: {},
    currentAddress: '',
    sendApproveAfterDepositObj: {},
  };

  init = async () => {
    this.store = await createPersistStore<PerpsServiceStore>({
      name: 'perps',
      template: {
        agentVaults: '',
        agentPreferences: {},
        currentAddress: '',
      },
    });

    this.memoryState.agentWallets = {};
    this.memoryState.sendApproveAfterDepositObj = {};
  };

  saveSendApproveAfterDeposit = async (
    masterAddress: string,
    approveDataStr: string
  ) => {
    this.memoryState.sendApproveAfterDepositObj = {
      ...this.memoryState.sendApproveAfterDepositObj,
      [masterAddress]: JSON.parse(approveDataStr),
    };
  };

  getSendApproveAfterDeposit = async (masterAddress: string) => {
    const res = this.memoryState.sendApproveAfterDepositObj[masterAddress];
    delete this.memoryState.sendApproveAfterDepositObj[masterAddress];
    return res;
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

      console.log(vaultsMap);

      // Format data for memory state
      for (const masterAddress in vaultsMap) {
        const privateKey = vaultsMap[masterAddress];
        const preference = this.store.agentPreferences[masterAddress] || {
          agentAddress: '',
        };
        this.memoryState.agentWallets[masterAddress] = {
          vault: privateKey,
          preference,
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
      [normalizedAddress]: preference,
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
      [normalizedAddress]: preference,
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
