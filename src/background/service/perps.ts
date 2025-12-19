import { last } from 'lodash';
import { createPersistStore } from 'background/utils';
import { getRandomBytesSync } from 'ethereum-cryptography/random.js';
import { secp256k1 } from 'ethereum-cryptography/secp256k1.js';
import { bytesToHex, publicToAddress } from '@ethereumjs/util';
import { keyringService } from '.';
import { SendApproveParams } from '@rabby-wallet/hyperliquid-sdk';
import { Account } from '@/background/service/preference';
export interface AgentWalletInfo {
  vault: string;
  preference: {
    agentAddress: string;
    approveSignatures: ApproveSignatures;
  };
}

interface StoreAccount {
  address: string;
  type: string;
  brandName: string;
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
  inviteConfig: {
    [address: string]: {
      lastInvitedAt?: number;
      lastConnectedAt?: number;
    };
  };
  currentAccount: StoreAccount | null;
  lastUsedAccount: StoreAccount | null;
  hasDoneNewUserProcess: boolean;
}
export interface PerpsServiceMemoryState {
  agentWallets: {
    // key is master wallet address
    [address: string]: AgentWalletInfo;
  };
  unlockPromise: Promise<void> | null;
}

class PerpsService {
  private store?: PerpsServiceStore;
  private memoryState: PerpsServiceMemoryState = {
    agentWallets: {},
    unlockPromise: null,
  };

  init = async () => {
    this.store = await createPersistStore<PerpsServiceStore>({
      name: 'perps',
      template: {
        agentVaults: '',
        agentPreferences: {},
        inviteConfig: {},
        currentAccount: null,
        // no clear account , just cache for last used
        lastUsedAccount: null,
        hasDoneNewUserProcess: false,
      },
    });

    this.memoryState.agentWallets = {};
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
    const unlock = async () => {
      if (!this.store) {
        throw new Error('PerpsService not initialized');
      }
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
    this.memoryState.unlockPromise = unlock();
    /**
     *  unlock 是一个耗时比较长的任务，所以如果在解锁时立即尝试获取 agentWallet 可能会碰到解锁没有完成的情况
     *  所以这里把 promise 放到内存里，如果有立即读取的需求需要先读一下 promise 的状态
     * */
    this.memoryState.unlockPromise.finally(() => {
      this.memoryState.unlockPromise = null;
    });
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
    if (this.memoryState.unlockPromise) {
      await this.memoryState.unlockPromise;
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

  setCurrentAccount = async (account: Account | null) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    if (account) {
      this.store.lastUsedAccount = {
        address: account?.address,
        type: account?.type,
        brandName: account?.brandName,
      };
      this.store.currentAccount = {
        address: account.address,
        type: account.type,
        brandName: account.brandName,
      };
    } else {
      this.store.currentAccount = null;
    }
  };

  getLastUsedAccount = async () => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    return this.store.lastUsedAccount;
  };

  getCurrentAccount = async () => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    return this.store.currentAccount;
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

    if (
      this.store.currentAccount?.address.toLowerCase() === normalizedAddress
    ) {
      this.store.currentAccount = null;
    }
    if (
      this.store.lastUsedAccount?.address.toLowerCase() === normalizedAddress
    ) {
      this.store.lastUsedAccount = null;
    }
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

  getInviteConfig = async (address: string) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    return this.store.inviteConfig[address.toLowerCase()];
  };

  setInviteConfig = async (
    address: string,
    config: { lastConnectedAt?: number; lastInvitedAt?: number }
  ) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    this.store.inviteConfig[address.toLowerCase()] = {
      ...this.store.inviteConfig[address.toLowerCase()],
      ...config,
    };
  };

  // only test use
  resetStore = async () => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }
    this.store = {
      agentVaults: '',
      agentPreferences: {},
      currentAccount: null,
      lastUsedAccount: null,
      hasDoneNewUserProcess: false,
      inviteConfig: {},
    };
    this.memoryState.agentWallets = {};
  };
}

export default new PerpsService();
