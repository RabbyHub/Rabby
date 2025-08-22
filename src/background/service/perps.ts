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
  agentWallets: {
    [address: string]: AgentWalletInfo;
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
        agentWallets: {},
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
    for (const masterAddress in this.store.agentWallets) {
      const cur = this.store.agentWallets[masterAddress];
      const privateKey = (await keyringService.decryptWithPassword(
        cur.vault
      )) as string;
      this.memoryState.agentWallets[masterAddress] = {
        vault: privateKey,
        preference: cur.preference,
      };
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

    const encryptedVault = await keyringService.encryptWithPassword(vault);

    const walletInfo: AgentWalletInfo = {
      vault: encryptedVault,
      preference,
    };

    this.store.agentWallets = {
      ...this.store.agentWallets,
      [normalizedAddress]: walletInfo,
    };

    this.memoryState.agentWallets = {
      ...this.memoryState.agentWallets,
      [normalizedAddress]: {
        vault,
        preference,
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
    const existingWallet = this.store.agentWallets[normalizedAddress];

    if (!existingWallet) {
      throw new Error(`Agent wallet not found for address: ${address}`);
    }

    this.store.agentWallets = {
      ...this.store.agentWallets,
      [normalizedAddress]: {
        ...existingWallet,
        preference,
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

    const updatedWallets = { ...this.store.agentWallets };
    delete updatedWallets[normalizedAddress];
    this.store.agentWallets = updatedWallets;

    const updatedMemoryWallets = { ...this.memoryState.agentWallets };
    delete updatedMemoryWallets[normalizedAddress];
    this.memoryState.agentWallets = updatedMemoryWallets;
  };

  hasAgentWallet = (address: string) => {
    if (!this.store) {
      return false;
    }

    const normalizedAddress = address.toLowerCase();
    return !!this.store.agentWallets[normalizedAddress];
  };

  getAgentWalletPreference = (address: string) => {
    if (!this.store) {
      throw new Error('PerpsService not initialized');
    }

    const normalizedAddress = address.toLowerCase();
    const wallet = this.store.agentWallets[normalizedAddress];

    if (!wallet) {
      return null;
    }

    return wallet.preference;
  };
}

export default new PerpsService();
