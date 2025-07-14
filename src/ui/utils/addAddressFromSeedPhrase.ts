import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { WalletController } from './WalletContext';
import { generateAliasName } from '@/utils/account';
import { isSameAddress } from './index';

/**
 * Adds a new address from an existing seed phrase
 * @param wallet The wallet controller instance
 * @param publicKey The public key of the seed phrase
 * @returns The newly added address information
 */
export const addAddressFromSeedPhrase = async (
  wallet: WalletController,
  publicKey: string
) => {
  try {
    // Get the keyring ID from the public key
    const keyringId = await wallet.getMnemonicKeyRingIdFromPublicKey(publicKey);

    if (!keyringId) {
      throw new Error('Failed to get keyring ID from public key');
    }

    // Get all current accounts to check which ones are already imported
    const currentAccounts = await wallet.getAllClassAccounts();
    console.log(
      'addAddressFromSeedPhrase - Current accounts:',
      currentAccounts,
      currentAccounts[0]?.accounts
    );
    const currentAddresses = currentAccounts?.[0]?.accounts.map((account) =>
      account.address?.toLowerCase()
    );
    console.log(
      'addAddressFromSeedPhrase - Current addresses:',
      currentAddresses
    );

    // Get available addresses from the seed phrase
    const availableAccounts = await wallet.requestKeyring(
      KEYRING_TYPE.HdKeyring,
      'getAddresses',
      keyringId,
      0,
      10 // Fetch first 10 addresses
    );

    console.log(
      'addAddressFromSeedPhrase - Available accounts:',
      availableAccounts
    );

    // Find the first address that's not already imported
    const accountToAdd = availableAccounts.find(
      (account) => !currentAddresses.includes(account.address.toLowerCase())
    );

    if (!accountToAdd) {
      throw new Error('No available addresses to add');
    }

    // Generate alias name for the new address
    const index =
      (await wallet.getKeyringIndex(KEYRING_CLASS.MNEMONIC, keyringId)) || 0;
    const addressCount = currentAccounts.filter(
      (account) => account.type === KEYRING_TYPE.HdKeyring
    )?.[0]?.accounts.length;

    const aliasName = generateAliasName({
      keyringType: KEYRING_CLASS.MNEMONIC,
      keyringCount: index,
      addressCount,
    });

    // Update cache alias
    await wallet.updateCacheAlias({
      address: accountToAdd.address,
      name: aliasName,
    });

    // Add the address to the wallet
    await wallet.requestKeyring(
      KEYRING_TYPE.HdKeyring,
      'activeAccounts',
      keyringId,
      [accountToAdd.index - 1]
    );

    // Update alias name
    await wallet.updateAlianName(accountToAdd.address.toLowerCase(), aliasName);

    // Return the added address information
    return {
      address: accountToAdd.address,
      index: accountToAdd.index,
      aliasName,
    };
  } catch (error) {
    console.error('Error adding address from seed phrase:', error);
    throw error;
  }
};
