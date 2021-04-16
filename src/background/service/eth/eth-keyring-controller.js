/// fork from https://github.com/MetaMask/KeyringController/blob/master/index.js

const { EventEmitter } = require('events')
const log = require('loglevel')
const ethUtil = require('ethereumjs-util')

const { BN } = ethUtil
const bip39 = require('bip39')
const ObservableStore = require('obs-store')
const encryptor = require('browser-passworder')
const { normalize: normalizeAddress } = require('eth-sig-util')

const SimpleKeyring = require('eth-simple-keyring')
const HdKeyring = require('eth-hd-keyring')

const keyringTypes = [
  SimpleKeyring,
  HdKeyring,
]

class KeyringController extends EventEmitter {

  //
  // PUBLIC METHODS
  //

  constructor (opts) {
    super()
    const initState = opts.initState || {}
    this.keyringTypes = opts.keyringTypes ? keyringTypes.concat(opts.keyringTypes) : keyringTypes
    this.store = new ObservableStore(initState)
    this.memStore = new ObservableStore({
      isUnlocked: false,
      keyringTypes: this.keyringTypes.map((krt) => krt.type),
      keyrings: [],
    })

    this.encryptor = opts.encryptor || encryptor
    this.keyrings = []
  }

  /**
   * Full Update
   *
   * Emits the `update` event and @returns a Promise that resolves to
   * the current state.
   *
   * Frequently used to end asynchronous chains in this class,
   * indicating consumers can often either listen for updates,
   * or accept a state-resolving promise to consume their results.
   *
   * @returns {Object} The controller state.
   */
  fullUpdate () {
    this.emit('update', this.memStore.getState())
    return this.memStore.getState()
  }

  /**
   * Create New Vault And Keychain
   *
   * Destroys any old encrypted storage,
   * creates a new encrypted store with the given password,
   * randomly creates a new HD wallet with 1 account,
   * faucets that account on the testnet.
   *
   * @emits KeyringController#unlock
   * @param {string} password - The password to encrypt the vault with.
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
  createNewVaultAndKeychain (password) {
    return this.persistAllKeyrings(password)
      .then(this.createFirstKeyTree.bind(this))
      .then(this.persistAllKeyrings.bind(this, password))
      .then(this.setUnlocked.bind(this))
      .then(this.fullUpdate.bind(this))
  }

  /**
   * Create New Vault And Keychain with Simple Keyring
   *
   * Destroys any old encrypted storage,
   * creates a new encrypted store with the given password,
   * randomly creates a new HD wallet with 1 account,
   * faucets that account on the testnet.
   *
   * @emits KeyringController#unlock
   * @param {string} password - The password to encrypt the vault with.
   * @param {string} privateKey - The privateKey to generate address
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
   createNewVaultAndSimpleKeyring (password, privateKey) {
    return this.persistAllKeyrings(password)
      .then(this.addNewKeyring.bind(this, 'Simple Key Pair', [privateKey]))
      .then(this.persistAllKeyrings.bind(this, password))
      .then(this.setUnlocked.bind(this))
      .then(this.fullUpdate.bind(this))
  }

  /**
   * CreateNewVaultAndRestore
   *
   * Destroys any old encrypted storage,
   * creates a new encrypted store with the given password,
   * creates a new HD wallet from the given seed with 1 account.
   *
   * @emits KeyringController#unlock
   * @param {string} password - The password to encrypt the vault with
   * @param {string} seed - The BIP44-compliant seed phrase.
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
  createNewVaultAndRestore (password, seed) {
    if (typeof password !== 'string') {
      return Promise.reject(new Error('Password must be text.'))
    }

    if (!bip39.validateMnemonic(seed)) {
      return Promise.reject(new Error('Seed phrase is invalid.'))
    }

    this.clearKeyrings()

    return this.persistAllKeyrings(password)
      .then(() => {
        return this.addNewKeyring('HD Key Tree', {
          mnemonic: seed,
          numberOfAccounts: 1,
        })
      })
      .then((firstKeyring) => {
        return firstKeyring.getAccounts()
      })
      .then(([firstAccount]) => {
        if (!firstAccount) {
          throw new Error('KeyringController - First Account not found.')
        }
        return null
      })
      .then(this.persistAllKeyrings.bind(this, password))
      .then(this.setUnlocked.bind(this))
      .then(this.fullUpdate.bind(this))
  }

  /**
   * Set Locked
   * This method deallocates all secrets, and effectively locks MetaMask.
   *
   * @emits KeyringController#lock
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
  async setLocked () {
    // set locked
    this.password = null
    this.memStore.updateState({ isUnlocked: false })
    // remove keyrings
    this.keyrings = []
    await this._updateMemStoreKeyrings()
    this.emit('lock')
    return this.fullUpdate()
  }

  /**
   * Submit Password
   *
   * Attempts to decrypt the current vault and load its keyrings
   * into memory.
   *
   * Temporarily also migrates any old-style vaults first, as well.
   * (Pre MetaMask 3.0.0)
   *
   * @emits KeyringController#unlock
   * @param {string} password - The keyring controller password.
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
  submitPassword (password) {
    return this.unlockKeyrings(password)
      .then((keyrings) => {
        this.keyrings = keyrings
        this.setUnlocked()
        return this.fullUpdate()
      })
  }

  /**
   * Verify Password
   *
   * Attempts to decrypt the current vault with a given password
   * to verify its validity.
   *
   * @param {string} password
   */
  async verifyPassword (password) {
    const encryptedVault = this.store.getState().vault
    if (!encryptedVault) {
      throw new Error('Cannot unlock without a previous vault.')
    }
    await this.encryptor.decrypt(password, encryptedVault)
  }

  /**
   * Add New Keyring
   *
   * Adds a new Keyring of the given `type` to the vault
   * and the current decrypted Keyrings array.
   *
   * All Keyring classes implement a unique `type` string,
   * and this is used to retrieve them from the keyringTypes array.
   *
   * @param {string} type - The type of keyring to add.
   * @param {Object} opts - The constructor options for the keyring.
   * @returns {Promise<Keyring>} The new keyring.
   */
  addNewKeyring (type, opts) {
    const Keyring = this.getKeyringClassForType(type)
    const keyring = new Keyring(opts)
    return keyring.getAccounts()
      .then((accounts) => {
        return this.checkForDuplicate(type, accounts)
      })
      .then(() => {
        this.keyrings.push(keyring)
        return this.persistAllKeyrings()
      })
      .then(() => this._updateMemStoreKeyrings())
      .then(() => this.fullUpdate())
      .then(() => {
        return keyring
      })
  }

  /**
   * Remove Empty Keyrings
   *
   * Loops through the keyrings and removes the ones with empty accounts
   * (usually after removing the last / only account) from a keyring
   */
  async removeEmptyKeyrings () {
    const validKeyrings = []

    // Since getAccounts returns a Promise
    // We need to wait to hear back form each keyring
    // in order to decide which ones are now valid (accounts.length > 0)

    await Promise.all(this.keyrings.map(async (keyring) => {
      const accounts = await keyring.getAccounts()
      if (accounts.length > 0) {
        validKeyrings.push(keyring)
      }
    }))
    this.keyrings = validKeyrings
  }

  /**
   * Checks for duplicate keypairs, using the the first account in the given
   * array. Rejects if a duplicate is found.
   *
   * Only supports 'Simple Key Pair'.
   *
   * @param {string} type - The key pair type to check for.
   * @param {Array<string>} newAccountArray - Array of new accounts.
   * @returns {Promise<Array<string>>} The account, if no duplicate is found.
   */
  checkForDuplicate (type, newAccountArray) {
    return this.getAccounts()
      .then((accounts) => {
        switch (type) {
          case 'Simple Key Pair': {
            const isIncluded = Boolean(
              accounts.find(
                (key) => (
                  key === newAccountArray[0] ||
                  key === ethUtil.stripHexPrefix(newAccountArray[0])),
              ),
            )
            return isIncluded
              ? Promise.reject(new Error('The account you\'re are trying to import is a duplicate'))
              : Promise.resolve(newAccountArray)
          }
          default: {
            return Promise.resolve(newAccountArray)
          }
        }
      })
  }

  /**
   * Add New Account
   *
   * Calls the `addAccounts` method on the given keyring,
   * and then saves those changes.
   *
   * @param {Keyring} selectedKeyring - The currently selected keyring.
   * @returns {Promise<Object>} A Promise that resolves to the state.
   */
  addNewAccount (selectedKeyring) {
    return selectedKeyring.addAccounts(1)
      .then((accounts) => {
        accounts.forEach((hexAccount) => {
          this.emit('newAccount', hexAccount)
        })
      })
      .then(this.persistAllKeyrings.bind(this))
      .then(this._updateMemStoreKeyrings.bind(this))
      .then(this.fullUpdate.bind(this))
  }

  /**
   * Export Account
   *
   * Requests the private key from the keyring controlling
   * the specified address.
   *
   * Returns a Promise that may resolve with the private key string.
   *
   * @param {string} address - The address of the account to export.
   * @returns {Promise<string>} The private key of the account.
   */
  exportAccount (address) {
    try {
      return this.getKeyringForAccount(address)
        .then((keyring) => {
          return keyring.exportAccount(normalizeAddress(address))
        })
    } catch (e) {
      return Promise.reject(e)
    }
  }

  /**
   *
   * Remove Account
   *
   * Removes a specific account from a keyring
   * If the account is the last/only one then it also removes the keyring.
   *
   * @param {string} address - The address of the account to remove.
   * @returns {Promise<void>} A Promise that resolves if the operation was successful.
   */
  removeAccount (address) {
    return this.getKeyringForAccount(address)
      .then((keyring) => {
        // Not all the keyrings support this, so we have to check
        if (typeof keyring.removeAccount === 'function') {
          keyring.removeAccount(address)
          this.emit('removedAccount', address)
          return keyring.getAccounts()
        }
        return Promise.reject(new Error(
          `Keyring ${keyring.type} doesn't support account removal operations`,
        ))
      })
      .then((accounts) => {
        // Check if this was the last/only account
        if (accounts.length === 0) {
          return this.removeEmptyKeyrings()
        }
        return undefined
      })
      .then(this.persistAllKeyrings.bind(this))
      .then(this._updateMemStoreKeyrings.bind(this))
      .then(this.fullUpdate.bind(this))
      .catch((e) => {
        return Promise.reject(e)
      })
  }

  //
  // SIGNING METHODS
  //

  /**
   * Sign Ethereum Transaction
   *
   * Signs an Ethereum transaction object.
   *
   * @param {Object} ethTx - The transaction to sign.
   * @param {string} _fromAddress - The transaction 'from' address.
   * @param {Object} opts - Signing options.
   * @returns {Promise<Object>} The signed transactio object.
   */
  signTransaction (ethTx, _fromAddress, opts = {}) {
    const fromAddress = normalizeAddress(_fromAddress)
    return this.getKeyringForAccount(fromAddress)
      .then((keyring) => {
        return keyring.signTransaction(fromAddress, ethTx, opts)
      })
  }

  /**
   * Sign Message
   *
   * Attempts to sign the provided message parameters.
   *
   * @param {Object} msgParams - The message parameters to sign.
   * @returns {Promise<Buffer>} The raw signature.
   */
  signMessage (msgParams, opts = {}) {
    const address = normalizeAddress(msgParams.from)
    return this.getKeyringForAccount(address)
      .then((keyring) => {
        return keyring.signMessage(address, msgParams.data, opts)
      })
  }

  /**
   * Sign Personal Message
   *
   * Attempts to sign the provided message paramaters.
   * Prefixes the hash before signing per the personal sign expectation.
   *
   * @param {Object} msgParams - The message parameters to sign.
   * @returns {Promise<Buffer>} The raw signature.
   */
  signPersonalMessage (msgParams, opts = {}) {
    const address = normalizeAddress(msgParams.from)
    return this.getKeyringForAccount(address)
      .then((keyring) => {
        return keyring.signPersonalMessage(address, msgParams.data, opts)
      })
  }

  /**
   * Get encryption public key
   *
   * Get encryption public key for using in encrypt/decrypt process.
   *
   * @param {Object} address - The address to get the encryption public key for.
   * @returns {Promise<Buffer>} The public key.
   */
  getEncryptionPublicKey (_address, opts = {}) {
    const address = normalizeAddress(_address)
    return this.getKeyringForAccount(address)
      .then((keyring) => {
        return keyring.getEncryptionPublicKey(address, opts)
      })
  }

  /**
   * Decrypt Message
   *
   * Attempts to decrypt the provided message parameters.
   *
   * @param {Object} msgParams - The decryption message parameters.
   * @returns {Promise<Buffer>} The raw decryption result.
   */
  decryptMessage (msgParams, opts = {}) {
    const address = normalizeAddress(msgParams.from)
    return this.getKeyringForAccount(address)
      .then((keyring) => {
        return keyring.decryptMessage(address, msgParams.data, opts)
      })
  }

  /**
   * Sign Typed Data
   * (EIP712 https://github.com/ethereum/EIPs/pull/712#issuecomment-329988454)
   *
   * @param {Object} msgParams - The message parameters to sign.
   * @returns {Promise<Buffer>} The raw signature.
   */
  signTypedMessage (msgParams, opts = { version: 'V1' }) {
    const address = normalizeAddress(msgParams.from)
    return this.getKeyringForAccount(address)
      .then((keyring) => {
        return keyring.signTypedData(address, msgParams.data, opts)
      })
  }

  /**
   * Gets the app key address for the given Ethereum address and origin.
   *
   * @param {string} _address - The Ethereum address for the app key.
   * @param {string} origin - The origin for the app key.
   * @returns {string} The app key address.
   */
  async getAppKeyAddress (_address, origin) {
    const address = normalizeAddress(_address)
    const keyring = await this.getKeyringForAccount(address)
    return keyring.getAppKeyAddress(address, origin)
  }

  /**
   * Exports an app key private key for the given Ethereum address and origin.
   *
   * @param {string} _address - The Ethereum address for the app key.
   * @param {string} origin - The origin for the app key.
   * @returns {string} The app key private key.
   */
  async exportAppKeyForAddress (_address, origin) {
    const address = normalizeAddress(_address)
    const keyring = await this.getKeyringForAccount(address)
    if (!('exportAccount' in keyring)) {
      throw new Error(`The keyring for address ${_address} does not support exporting.`)
    }
    return keyring.exportAccount(address, { withAppKeyOrigin: origin })
  }

  //
  // PRIVATE METHODS
  //

  /**
   * Create First Key Tree
   *
   * - Clears the existing vault
   * - Creates a new vault
   * - Creates a random new HD Keyring with 1 account
   * - Makes that account the selected account
   * - Faucets that account on testnet
   * - Puts the current seed words into the state tree
   *
   * @returns {Promise<void>} - A promise that resovles if the operation was successful.
   */
  createFirstKeyTree () {
    this.clearKeyrings()
    return this.addNewKeyring('HD Key Tree', { numberOfAccounts: 1 })
      .then((keyring) => {
        return keyring.getAccounts()
      })
      .then(([firstAccount]) => {
        if (!firstAccount) {
          throw new Error('KeyringController - No account found on keychain.')
        }
        const hexAccount = normalizeAddress(firstAccount)
        this.emit('newVault', hexAccount)
        return null
      })
  }

  /**
   * Persist All Keyrings
   *
   * Iterates the current `keyrings` array,
   * serializes each one into a serialized array,
   * encrypts that array with the provided `password`,
   * and persists that encrypted string to storage.
   *
   * @param {string} password - The keyring controller password.
   * @returns {Promise<boolean>} Resolves to true once keyrings are persisted.
   */
  persistAllKeyrings (password = this.password) {
    if (typeof password !== 'string') {
      return Promise.reject(new Error(
        'KeyringController - password is not a string',
      ))
    }

    this.password = password
    return Promise.all(this.keyrings.map((keyring) => {
      return Promise.all([keyring.type, keyring.serialize()])
        .then((serializedKeyringArray) => {
        // Label the output values on each serialized Keyring:
          return {
            type: serializedKeyringArray[0],
            data: serializedKeyringArray[1],
          }
        })
    }))
      .then((serializedKeyrings) => {
        return this.encryptor.encrypt(this.password, serializedKeyrings)
      })
      .then((encryptedString) => {
        this.store.updateState({ vault: encryptedString })
        return true
      })
  }

  /**
   * Unlock Keyrings
   *
   * Attempts to unlock the persisted encrypted storage,
   * initializing the persisted keyrings to RAM.
   *
   * @param {string} password - The keyring controller password.
   * @returns {Promise<Array<Keyring>>} The keyrings.
   */
  async unlockKeyrings (password) {
    const encryptedVault = this.store.getState().vault
    if (!encryptedVault) {
      throw new Error('Cannot unlock without a previous vault.')
    }

    await this.clearKeyrings()
    const vault = await this.encryptor.decrypt(password, encryptedVault)
    this.password = password
    await Promise.all(vault.map(this._restoreKeyring.bind(this)))
    await this._updateMemStoreKeyrings()
    return this.keyrings
  }

  /**
   * Restore Keyring
   *
   * Attempts to initialize a new keyring from the provided serialized payload.
   * On success, updates the memStore keyrings and returns the resulting
   * keyring instance.
   *
   * @param {Object} serialized - The serialized keyring.
   * @returns {Promise<Keyring>} The deserialized keyring.
   */
  async restoreKeyring (serialized) {
    const keyring = await this._restoreKeyring(serialized)
    await this._updateMemStoreKeyrings()
    return keyring
  }

  /**
   * Restore Keyring Helper
   *
   * Attempts to initialize a new keyring from the provided serialized payload.
   * On success, returns the resulting keyring instance.
   *
   * @param {Object} serialized - The serialized keyring.
   * @returns {Promise<Keyring>} The deserialized keyring.
   */
  async _restoreKeyring (serialized) {
    const { type, data } = serialized

    const Keyring = this.getKeyringClassForType(type)
    const keyring = new Keyring()
    await keyring.deserialize(data)
    // getAccounts also validates the accounts for some keyrings
    await keyring.getAccounts()
    this.keyrings.push(keyring)
    return keyring
  }

  /**
   * Get Keyring Class For Type
   *
   * Searches the current `keyringTypes` array
   * for a Keyring class whose unique `type` property
   * matches the provided `type`,
   * returning it if it exists.
   *
   * @param {string} type - The type whose class to get.
   * @returns {Keyring|undefined} The class, if it exists.
   */
  getKeyringClassForType (type) {
    return this.keyringTypes.find((kr) => kr.type === type)
  }

  /**
   * Get Keyrings by Type
   *
   * Gets all keyrings of the given type.
   *
   * @param {string} type - The keyring types to retrieve.
   * @returns {Array<Keyring>} The keyrings.
   */
  getKeyringsByType (type) {
    return this.keyrings.filter((keyring) => keyring.type === type)
  }

  /**
   * Get Accounts
   *
   * Returns the public addresses of all current accounts
   * managed by all currently unlocked keyrings.
   *
   * @returns {Promise<Array<string>>} The array of accounts.
   */
  async getAccounts () {
    const keyrings = this.keyrings || []
    const addrs = await Promise.all(keyrings.map((kr) => kr.getAccounts()))
      .then((keyringArrays) => {
        return keyringArrays.reduce((res, arr) => {
          return res.concat(arr)
        }, [])
      })
    return addrs.map(normalizeAddress)
  }

  /**
   * Get Keyring For Account
   *
   * Returns the currently initialized keyring that manages
   * the specified `address` if one exists.
   *
   * @param {string} address - An account address.
   * @returns {Promise<Keyring>} The keyring of the account, if it exists.
   */
  getKeyringForAccount (address) {
    const hexed = normalizeAddress(address)
    log.debug(`KeyringController - getKeyringForAccount: ${hexed}`)

    return Promise.all(this.keyrings.map((keyring) => {
      return Promise.all([
        keyring,
        keyring.getAccounts(),
      ])
    }))
      .then((candidates) => {
        const winners = candidates.filter((candidate) => {
          const accounts = candidate[1].map(normalizeAddress)
          return accounts.includes(hexed)
        })
        if (winners && winners.length > 0) {
          return winners[0][0]
        }
        throw new Error('No keyring found for the requested account.')

      })
  }

  /**
   * Display For Keyring
   *
   * Is used for adding the current keyrings to the state object.
   * @param {Keyring} keyring
   * @returns {Promise<Object>} A keyring display object, with type and accounts properties.
   */
  displayForKeyring (keyring) {
    return keyring.getAccounts()
      .then((accounts) => {
        return {
          type: keyring.type,
          accounts: accounts.map(normalizeAddress),
        }
      })
  }

  getAllTypedAccounts () {
    return Promise.all(this.keyrings.map(this.displayForKeyring));
  }

  /**
   * Add Gas Buffer
   *
   * Adds a healthy buffer of gas to an initial gas estimate.
   *
   * @param {string} gas - The gas value, as a hex string.
   * @returns {string} The buffered gas, as a hex string.
   */
  addGasBuffer (gas) {
    const gasBuffer = new BN('100000', 10)
    const bnGas = new BN(ethUtil.stripHexPrefix(gas), 16)
    const correct = bnGas.add(gasBuffer)
    return ethUtil.addHexPrefix(correct.toString(16))
  }

  /**
   * Clear Keyrings
   *
   * Deallocates all currently managed keyrings and accounts.
   * Used before initializing a new vault.
   */
  /* eslint-disable require-await */
  async clearKeyrings () {
    // clear keyrings from memory
    this.keyrings = []
    this.memStore.updateState({
      keyrings: [],
    })
  }

  /**
   * Update Memstore Keyrings
   *
   * Updates the in-memory keyrings, without persisting.
   */
  async _updateMemStoreKeyrings () {
    const keyrings = await Promise.all(this.keyrings.map(this.displayForKeyring))
    return this.memStore.updateState({ keyrings })
  }

  /**
   * Unlock Keyrings
   *
   * Unlocks the keyrings.
   *
   * @emits KeyringController#unlock
   */
  setUnlocked () {
    this.memStore.updateState({ isUnlocked: true })
    this.emit('unlock')
  }
}

module.exports = KeyringController
