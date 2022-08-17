import crypto from 'crypto';
import EventEmitter from 'events';
import BN from 'bn.js';
import * as SDK from 'gridplus-sdk';
import { TransactionFactory } from '@ethereumjs/tx';
import * as Util from 'ethereumjs-util';
import * as rlp from 'rlp';
import { initHDKeyring, invokeHDKeyring } from './hd-proxy';
import { browser } from 'webextension-polyfill-ts';

const keyringType = 'GridPlus Hardware';
const HARDENED_OFFSET = 0x80000000;
const PER_PAGE = 5;
const CLOSE_CODE = -1000;
const STANDARD_HD_PATH = `m/44'/60'/0'/0/x`;
const SDK_TIMEOUT = 120000;

class LatticeKeyring extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.appName = 'Rabby';
    this.type = keyringType;
    this._resetDefaults();
    this.deserialize(opts);
  }

  //-------------------------------------------------------------------
  // Keyring API (per `https://github.com/MetaMask/eth-simple-keyring`)
  //-------------------------------------------------------------------
  async deserialize(opts = {}) {
    this.hdPath = STANDARD_HD_PATH;
    if (opts.creds) this.creds = opts.creds;
    if (opts.accounts) this.accounts = opts.accounts;
    if (opts.accountIndices) this.accountIndices = opts.accountIndices;
    if (opts.accountOpts) this.accountOpts = opts.accountOpts;
    if (opts.walletUID) this.walletUID = opts.walletUID;
    if (opts.name)
      // Legacy; use is deprecated and appName is more descriptive
      this.appName = opts.name;
    if (opts.appName) this.appName = opts.appName;
    if (opts.network) this.network = opts.network;
    if (opts.page) this.page = opts.page;
    if (opts.sdkState) this.sdkState = opts.sdkState;
    return;
  }

  setHdPath() {
    this.hdPath = STANDARD_HD_PATH;
  }

  async serialize() {
    return {
      creds: this.creds,
      accounts: this.accounts,
      accountIndices: this.accountIndices,
      accountOpts: this.accountOpts,
      walletUID: this.walletUID,
      appName: this.appName,
      name: this.name, // Legacy; use is deprecated
      network: this.network,
      page: this.page,
      hdPath: this.hdPath,
      sdkState: this.keyringId
        ? await invokeHDKeyring('GRIDPLUS', 'getStateData')
        : null,
    };
  }

  // Deterimine if we have a connection to the Lattice and an existing wallet UID
  // against which to make requests.
  async isUnlocked() {
    return !!(await this._getCurrentWalletUID()) && !!this.keyringId;
  }

  // Initialize a session with the Lattice1 device using the GridPlus SDK
  // NOTE: `bypassOnStateData=true` allows us to rehydrate a new SDK session without
  // reconnecting to the target Lattice. This is only currently used for signing
  // because it eliminates the need for 2 connection requests and shaves off ~4-6sec.
  // We avoid passing `bypassOnStateData=true` for other calls on `unlock` to avoid
  // possible edge cases related to this new functionality (it's probably fine - just
  // being cautious). In the future we may remove `bypassOnStateData` entirely.
  async unlock(bypassOnStateData = false) {
    // Force compatability. `this.accountOpts` were added after other
    // state params and must be synced in order for this keyring to function.
    if (
      !this.accountOpts ||
      (this.accounts.length > 0 &&
        this.accountOpts.length != this.accounts.length)
    ) {
      this.forgetDevice();
      throw new Error(
        'You can now add multiple Lattice and SafeCard accounts at the same time! ' +
          'Your accounts have been cleared. Please press Continue to add them back in.'
      );
    }
    if (await this.isUnlocked()) {
      return 'Unlocked';
    }
    const creds = await this._getCreds();
    if (creds) {
      this.creds.deviceID = creds.deviceID;
      this.creds.password = creds.password;
      this.creds.endpoint = creds.endpoint || null;
    }
    const includedStateData = await this._initSession();
    // If state data was provided and if we are authorized to
    // bypass reconnecting, we can exit here.
    if (includedStateData && bypassOnStateData) {
      return 'Unlocked';
    }
    await this._connect();
    return 'Unlocked';
  }

  // Add addresses to the local store and return the full result
  async addAccounts(n = 1) {
    if (n === CLOSE_CODE) {
      // Special case: use a code to forget the device.
      // (This function is overloaded due to constraints upstream)
      this.forgetDevice();
      return [];
    } else if (n <= 0) {
      // Avoid non-positive numbers.
      throw new Error('Number of accounts to add must be a positive number.');
    }
    // Normal behavior: establish the connection and fetch addresses.
    await this.unlock();
    const addrs = await this._fetchAddresses(n, this.unlockedAccount);
    const walletUID = await this._getCurrentWalletUID();
    if (!walletUID) {
      // We should not add accounts that do not have wallet UIDs.
      // Something went wrong and needs to be retried.
      await this._connect();
      throw new Error('No active wallet found in Lattice. Please retry.');
    }
    // Add these indices
    addrs.forEach((addr, i) => {
      let alreadySaved = false;
      for (let j = 0; j < this.accounts.length; j++) {
        if (
          this.accounts[j] === addr &&
          this.accountOpts[j].walletUID === walletUID &&
          this.accountOpts[j].hdPath === this.hdPath
        )
          alreadySaved = true;
      }
      if (!alreadySaved) {
        this.accounts.push(addr);
        this.accountIndices.push(this.unlockedAccount + i);
        this.accountOpts.push({
          walletUID,
          hdPath: this.hdPath,
        });
      }
    });
    return this.accounts;
  }

  // Return the local store of addresses. This gets called when the extension unlocks.
  async getAccounts() {
    return this.accounts ? [...this.accounts] : [];
  }

  async signTransaction(address, tx) {
    let signedTx, v;
    // We will be adding a signature to hydration data for a new
    // transaction object since the sig data is not mutable.
    // Setup `txToReturn` data and start adding to it.
    const txToReturn = tx.toJSON();
    txToReturn.type = tx._type || null;
    // Setup info related to signer account
    const accountIdx = await this._findSignerIdx(address);
    const chainId = getTxChainId(tx).toNumber();
    const fwVersion = await invokeHDKeyring('GRIDPLUS', 'getFwVersion');
    const txDataType = await invokeHDKeyring('GRIDPLUS', 'getTxDataType');
    const addressIdx = this.accountIndices[accountIdx];
    const { hdPath } = this.accountOpts[accountIdx];
    const signerPath = this._getHDPathIndices(hdPath, addressIdx);
    // Lattice firmware v0.11.0 implemented EIP1559 and EIP2930
    // We should throw an error if we cannot support this.
    if (fwVersion.major === 0 && fwVersion.minor <= 11 && txDataType) {
      throw new Error('Please update Lattice firmware.');
    }
    // Build the signing request
    if (fwVersion.major > 0 || fwVersion.minor >= 15) {
      // Newer firmware versions support an easier pathway
      const data = {
        // Legacy transactions return tx params. Newer transactions
        // return the raw, serialized transaction
        payload: tx._type
          ? tx.getMessageToSign(false)
          : rlp.encode(tx.getMessageToSign(false)),
        curveType: SDK.Constants.SIGNING.CURVES.SECP256K1,
        hashType: SDK.Constants.SIGNING.HASHES.KECCAK256,
        encodingType: SDK.Constants.SIGNING.ENCODINGS.EVM,
        signerPath,
      };
      // Check if we can decode the calldata
      data.decoder = await getCalldataDecoder(tx);
      // Send the request
      signedTx = await invokeHDKeyring('GRIDPLUS', 'sign', [{ data }]);
    } else {
      // Older firmware versions (<0.15.0) use the legacy signing pathway.
      const data = getLegacyTxReq(tx);
      data.chainId = chainId;
      data.signerPath = signerPath;
      signedTx = await invokeHDKeyring('GRIDPLUS', 'sign', [
        { currency: 'ETH', data },
      ]);
    }
    // Ensure we got a signature back
    if (!signedTx.sig || !signedTx.sig.r || !signedTx.sig.s) {
      throw new Error('No signature returned.');
    }
    // Construct the `v` signature param
    if (signedTx.sig.v === undefined) {
      // V2 signature needs `v` calculated
      v = SDK.Utils.getV(tx, signedTx);
    } else {
      // Legacy signatures have `v` in the response
      v = signedTx.sig.v.length === 0 ? '0' : signedTx.sig.v.toString('hex');
    }

    // Pack the signature into the return object
    txToReturn.r = Util.addHexPrefix(signedTx.sig.r.toString('hex'));
    txToReturn.s = Util.addHexPrefix(signedTx.sig.s.toString('hex'));
    txToReturn.v = Util.addHexPrefix(v);

    // Make sure the active wallet is correct to avoid returning
    // a signature from an unexpected signer.
    const foundIdx = await this._accountIdxInCurrentWallet(address);
    if (foundIdx === null) {
      throw new Error(
        'Wrong account. Please change your Lattice wallet or ' +
          'switch to an account on your current active wallet.'
      );
    }
    return TransactionFactory.fromTxData(txToReturn, {
      common: tx.common,
      freeze: Object.isFrozen(tx),
    });
  }

  async signPersonalMessage(address, msg) {
    return this.signMessage(address, {
      payload: msg,
      protocol: 'signPersonal',
    });
  }

  async signTypedData(address, msg, opts) {
    if (opts.version && opts.version !== 'V4' && opts.version !== 'V3') {
      throw new Error(
        `Only signTypedData V3 and V4 messages (EIP712) are supported. Got version ${opts.version}`
      );
    }
    return this.signMessage(address, { payload: msg, protocol: 'eip712' });
  }

  async signMessage(address, msg) {
    const accountIdx = await this._findSignerIdx(address);
    let { payload, protocol } = msg;
    // If the message is not an object we assume it is a legacy signPersonal request
    if (!payload || !protocol) {
      payload = msg;
      protocol = 'signPersonal';
    }
    const addressIdx = this.accountIndices[accountIdx];
    const addressParentPath = this.accountOpts[accountIdx].hdPath;
    const req = {
      currency: 'ETH_MSG',
      data: {
        protocol,
        payload,
        signerPath: this._getHDPathIndices(addressParentPath, addressIdx),
      },
    };
    const res = await invokeHDKeyring('GRIDPLUS', 'sign', [req]);
    if (!res.sig) {
      throw new Error('No signature returned');
    }
    // Convert the `v` to a number. It should convert to 0 or 1
    let v;
    try {
      v = res.sig.v.toString('hex');
      if (v.length < 2) {
        v = `0${v}`;
      }
    } catch (err) {
      throw new Error('Invalid signature format returned.');
    }
    // Make sure the active wallet is correct to avoid returning
    // a signature from an unexpected signer.
    const foundIdx = await this._accountIdxInCurrentWallet(address);
    if (foundIdx === null) {
      throw new Error(
        'Wrong account. Please change your Lattice wallet or ' +
          'switch to an account on your current active wallet.'
      );
    }
    // Return the sig string
    return `0x${res.sig.r}${res.sig.s}${v}`;
  }

  async exportAccount(address) {
    throw new Error('exportAccount not supported by this device');
  }

  removeAccount(address) {
    this.accounts.forEach((account, i) => {
      if (account.toLowerCase() === address.toLowerCase()) {
        this.accounts.splice(i, 1);
        this.accountIndices.splice(i, 1);
        this.accountOpts.splice(i, 1);
        return;
      }
    });
  }

  async getFirstPage() {
    this.page = 0;
    return this._getPage(0);
  }

  async getNextPage() {
    return this._getPage(1);
  }

  async getPreviousPage() {
    return this._getPage(-1);
  }

  setAccountToUnlock(index) {
    this.unlockedAccount = parseInt(index, 10);
  }

  forgetDevice() {
    this._resetDefaults();
  }

  //-------------------------------------------------------------------
  // Internal methods and interface to SDK
  //-------------------------------------------------------------------
  // Find the account index of the requested address.
  // Note that this is the BIP39 path index, not the index in the address cache.
  async _findSignerIdx(address) {
    // Take note if this was already unlocked
    const wasUnlocked = await this.isUnlocked();
    // Unlock and get the wallet UID. We will bypass the reconnection
    // step if we are able to rehydrate an SDK session with state data.
    await this.unlock(true);
    let accountIdx = await this._accountIdxInCurrentWallet(address);
    if (accountIdx !== null) {
      return accountIdx;
    }
    // If this was unlocked already, the `this.unlock` call did not sync
    // data with the Lattice. We should force a sync by reconnecting.
    if (wasUnlocked) {
      await this._connect();
      // Check the new wallet and see if there is a match
      accountIdx = await this._accountIdxInCurrentWallet(address);
      if (accountIdx !== null) {
        return accountIdx;
      }
    }
    // If we could not find a match, exit here
    throw new Error(
      'Account not found in active Lattice wallet. Please switch.'
    );
  }

  async _accountIdxInCurrentWallet(address) {
    // Get the wallet UID associated with the signer and make sure
    // the Lattice has that as its active wallet before continuing.
    const accountIdx = await this._findAccountByAddress(address);
    const { walletUID } = this.accountOpts[accountIdx];
    // Get the last updated SDK wallet UID
    const activeWallet = await invokeHDKeyring('GRIDPLUS', 'getActiveWallet');
    if (!activeWallet) {
      this._connect();
      throw new Error('No active wallet in Lattice.');
    }
    const activeUID = activeWallet.uid.toString('hex');
    // If this is already the active wallet we don't need to make a request
    if (walletUID.toString('hex') === activeUID) {
      return accountIdx;
    }
    return null;
  }

  async _findAccountByAddress(address) {
    const addrs = await this.getAccounts();
    let accountIdx = -1;
    addrs.forEach((addr, i) => {
      if (address.toLowerCase() === addr.toLowerCase()) accountIdx = i;
    });
    if (accountIdx < 0) {
      throw new Error('Signer not present');
    }
    return accountIdx;
  }

  _getHDPathIndices(hdPath, insertIdx = 0) {
    const path = hdPath.split('/').slice(1);
    const indices = [];
    let usedX = false;
    path.forEach((_idx) => {
      const isHardened = _idx[_idx.length - 1] === "'";
      let idx = isHardened ? HARDENED_OFFSET : 0;
      // If there is an `x` in the path string, we will use it to insert our
      // index. This is useful for e.g. Ledger Live path. Most paths have the
      // changing index as the last one, so having an `x` in the path isn't
      // usually necessary.
      if (_idx.indexOf('x') > -1) {
        idx += insertIdx;
        usedX = true;
      } else if (isHardened) {
        idx += Number(_idx.slice(0, _idx.length - 1));
      } else {
        idx += Number(_idx);
      }
      indices.push(idx);
    });
    // If this path string does not include an `x`, we just append the index
    // to the end of the extracted set
    if (usedX === false) {
      indices.push(insertIdx);
    }
    // Sanity check -- Lattice firmware will throw an error for large paths
    if (indices.length > 5)
      throw new Error('Only HD paths with up to 5 indices are allowed.');
    return indices;
  }

  _resetDefaults() {
    this.accounts = [];
    this.accountIndices = [];
    this.accountOpts = [];
    this.isLocked = true;
    this.creds = {
      deviceID: null,
      password: null,
      endpoint: null,
    };
    this.walletUID = null;
    this.sdkSession = null;
    this.page = 0;
    this.unlockedAccount = 0;
    this.network = null;
    this.hdPath = STANDARD_HD_PATH;
  }

  async _openConnectorTab(url) {
    try {
      const browserTab = typeof window !== 'undefined' && window.open(url);
      // Preferred option for Chromium browsers. This extension runs in a window
      // for Chromium so we can do window-based communication very easily.
      if (browserTab) {
        return { chromium: browserTab };
      } else if (browser && browser.tabs && browser.tabs.create) {
        // FireFox extensions do not run in windows, so it will return `null` from
        // `window.open`. Instead, we need to use the `browser` API to open a tab.
        // We will surveille this tab to see if its URL parameters change, which
        // will indicate that the user has logged in.
        const tab = await browser.tabs.create({ url });
        return { firefox: tab };
      } else {
        throw new Error(
          'Unknown browser context. Cannot open Lattice connector.'
        );
      }
    } catch (err) {
      throw new Error('Failed to open Lattice connector.');
    }
  }

  async _findTabById(id) {
    const tabs = await browser.tabs.query({});
    return tabs.find((tab) => tab.id === id);
  }

  _getCreds() {
    return new Promise((resolve, reject) => {
      // We only need to setup if we don't have a deviceID
      if (this._hasCreds()) return resolve();
      // If we are not aware of what Lattice we should be talking to,
      // we need to open a window that lets the user go through the
      // pairing or connection process.
      const name = this.appName ? this.appName : 'Unknown';
      const base = 'https://lattice.gridplus.io';
      const url = `${base}?keyring=${name}&forceLogin=true`;
      let listenInterval;

      // PostMessage handler
      function receiveMessage(event) {
        // Ensure origin
        if (event.origin !== base) return;
        try {
          // Stop the listener
          clearInterval(listenInterval);
          // Parse and return creds
          const creds = JSON.parse(event.data);
          if (!creds.deviceID || !creds.password)
            return reject(
              new Error('Invalid credentials returned from Lattice.')
            );
          return resolve(creds);
        } catch (err) {
          return reject(err);
        }
      }

      // Open the tab
      this._openConnectorTab(url).then((conn) => {
        if (conn.chromium) {
          // On a Chromium browser we can just listen for a window message
          window.addEventListener('message', receiveMessage, false);
          // Watch for the open window closing before creds are sent back
          listenInterval = setInterval(() => {
            if (conn.chromium.closed) {
              clearInterval(listenInterval);
              return reject(new Error('Lattice connector closed.'));
            }
          }, 500);
        } else if (conn.firefox) {
          // For Firefox we cannot use `window` in the extension and can't
          // directly communicate with the tabs very easily so we use a
          // workaround: listen for changes to the URL, which will contain
          // the login info.
          // NOTE: This will only work if have `https://lattice.gridplus.io/*`
          // host permissions in your manifest file (and also `activeTab` permission)
          const loginUrlParam = '&loginCache=';
          listenInterval = setInterval(() => {
            this._findTabById(conn.firefox.id).then((tab) => {
              if (!tab || !tab.url) {
                return reject(new Error('Lattice connector closed.'));
              }
              // If the tab we opened contains a new URL param
              const paramLoc = tab.url.indexOf(loginUrlParam);
              if (paramLoc < 0) return;
              const dataLoc = paramLoc + loginUrlParam.length;
              // Stop this interval
              clearInterval(listenInterval);
              try {
                // Parse the login data. It is a stringified JSON object
                // encoded as a base64 string.
                const _creds = Buffer.from(
                  tab.url.slice(dataLoc),
                  'base64'
                ).toString();
                // Close the tab and return the credentials
                browser.tabs.remove(tab.id).then(() => {
                  const creds = JSON.parse(_creds);
                  if (!creds.deviceID || !creds.password)
                    return reject(
                      new Error('Invalid credentials returned from Lattice.')
                    );
                  return resolve(creds);
                });
              } catch (err) {
                return reject(
                  'Failed to get login data from Lattice. Please try again.'
                );
              }
            });
          }, 500);
        }
      });
    });
  }

  // [re]connect to the Lattice. This should be done frequently to ensure
  // the expected wallet UID is still the one active in the Lattice.
  // This will handle SafeCard insertion/removal events.
  async _connect() {
    await invokeHDKeyring('GRIDPLUS', 'connect', [this.creds.deviceID]);
  }

  async _initSession() {
    if (await this.isUnlocked()) {
      return;
    }
    let url = 'https://signing.gridpl.us';
    if (this.creds.endpoint) url = this.creds.endpoint;
    let setupData = {
      name: this.appName,
      baseUrl: url,
      timeout: SDK_TIMEOUT,
      privKey: this._genSessionKey(),
      network: this.network,
      skipRetryOnWrongWallet: true,
    };
    /* 
    NOTE: We need state to actually be synced by MetaMask or we can't
    use this. See: https://github.com/MetaMask/KeyringController/issues/130
    if (this.sdkState) {
      // If we have state data we can fully rehydrate the session.
      setupData = {
        stateData: this.sdkState,
        skipRetryOnWrongWallet: true,
      }
    }
    */
    // this.sdkSession = new SDK.Client(setupData);
    this.keyringId = await initHDKeyring('GRIDPLUS', setupData);
    // Return a boolean indicating whether we provided state data.
    // If we have, we can skip `connect`.
    return !!setupData.stateData;
  }

  async _fetchAddresses(n = 1, i = 0, recursedAddrs = []) {
    if (!(await this.isUnlocked())) {
      throw new Error('No connection to Lattice. Cannot fetch addresses.');
    }
    return this.__fetchAddresses(n, i);
  }

  async __fetchAddresses(n = 1, i = 0, recursedAddrs = []) {
    // Determine if we need to do a recursive call here. We prefer not to
    // because they will be much slower, but Ledger paths require it since
    // they are non-standard.
    if (n === 0) {
      return recursedAddrs;
    }
    const shouldRecurse = this._hdPathHasInternalVarIdx();

    // Make the request to get the requested address
    const addrData = {
      currency: 'ETH',
      startPath: this._getHDPathIndices(this.hdPath, i),
      n: shouldRecurse ? 1 : n,
    };
    const addrs = await invokeHDKeyring('GRIDPLUS', 'getAddresses', [addrData]);
    // Sanity check -- if this returned 0 addresses, handle the error
    if (addrs.length < 1) {
      throw new Error('No addresses returned');
    }
    // Return the addresses we fetched *without* updating state
    if (shouldRecurse) {
      return await this.__fetchAddresses(
        n - 1,
        i + 1,
        recursedAddrs.concat(addrs)
      );
    }
    return addrs;
  }

  async _getPage(increment = 0) {
    try {
      this.page += increment;
      if (this.page < 0) this.page = 0;
      const start = PER_PAGE * this.page;
      // Otherwise unlock the device and fetch more addresses
      await this.unlock();
      const addrs = await this._fetchAddresses(PER_PAGE, start);
      const accounts = addrs.map((address, i) => {
        return {
          address,
          balance: null,
          index: start + i + 1,
        };
      });
      return accounts;
    } catch (err) {
      // This will get hit for a few reasons. Here are two possibilities:
      // 1. The user has a SafeCard inserted, but not unlocked
      // 2. The user fetched a page for a different wallet, then switched
      //    interface on the device
      // In either event we should try to resync the wallet and if that
      // fails throw an error
      console.log(err);
      // try {
      //   await this._connect();
      //   const accounts = await this._getPage(0);
      //   return accounts;
      // } catch (err) {
      //   throw new Error(
      //     'Failed to get accounts. Please forget the device and try again. ' +
      //       'Make sure you do not have a locked SafeCard inserted.'
      //   );
      // }
    }
  }

  _hasCreds() {
    return (
      this.creds.deviceID !== null &&
      this.creds.password !== null &&
      this.appName
    );
  }

  _genSessionKey() {
    if (this.name && !this.appName)
      // Migrate from legacy param if needed
      this.appName = this.name;
    if (!this._hasCreds())
      throw new Error('No credentials -- cannot create session key!');
    const buf = Buffer.concat([
      Buffer.from(this.creds.password),
      Buffer.from(this.creds.deviceID),
      Buffer.from(this.appName),
    ]);
    return crypto.createHash('sha256').update(buf).digest();
  }

  // Determine if an HD path has a variable index internal to it.
  // e.g. m/44'/60'/x'/0/0 -> true, while m/44'/60'/0'/0/x -> false
  // This is just a hacky helper to avoid having to recursively call for non-ledger
  // derivation paths. Ledger is SO ANNOYING TO SUPPORT.
  _hdPathHasInternalVarIdx() {
    const path = this.hdPath.split('/').slice(1);
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i].indexOf('x') > -1) return true;
    }
    return false;
  }

  async _getCurrentWalletUID() {
    if (!this.keyringId) {
      return null;
    }
    const activeWallet = await invokeHDKeyring('GRIDPLUS', 'getActiveWallet');
    if (!activeWallet || !activeWallet.uid) {
      return null;
    }
    return activeWallet.uid.toString('hex');
  }
}

// -----
// HELPERS
// -----
function getTxChainId(tx) {
  if (tx && tx.common && typeof tx.common.chainIdBN === 'function') {
    return tx.common.chainIdBN();
  } else if (tx && tx.chainId) {
    return new BN(tx.chainId);
  }
  return new BN(1);
}

// We should include calldata decoder information in new requests so that
// ABI data can be decoded in place (i.e. without loading the definitions
// ahead of time).
async function getCalldataDecoder(tx) {
  // If there is no data, we can't decode it, obviously
  if (!tx.data || !tx.data.length || tx.data.length < 4) {
    return null;
  }
  let def, resp;
  const selector = Buffer.from(tx.data.slice(0, 4)).toString('hex');
  // Get the Solidity JSON ABI definitions from Etherscan, if available
  try {
    resp = await httpRequest(
      `https://api.etherscan.io/api?module=contract&action=getabi&address=${tx.to}`
    );
    const abi = JSON.parse(JSON.parse(resp).result);
    def = SDK.Calldata.EVM.parsers.parseSolidityJSONABI(selector, abi);
    return def;
  } catch (err) {
    console.warn('Failed to fetch ABI data from etherscan', err.message);
  }
  // Fallback to checking 4byte
  try {
    resp = await httpRequest(
      `https://www.4byte.directory/api/v1/signatures?hex_signature=0x${selector}`
    );
    const fourByteResults = JSON.parse(resp).results;
    if (fourByteResults.length > 0) {
      console.warn('WARNING: There are multiple results. Using the first one.');
    }
    const canonicalName = fourByteResults[0].text_signature;
    def = SDK.Calldata.EVM.parsers.parseCanonicalName(selector, canonicalName);
    return def;
  } catch (err) {
    console.warn('Failed to fetch data from 4byte', err.message);
  }
  return null;
}

// Legacy versions of Lattice firmware signed ETH transactions out of
// a now deprecated pathway. The request data is built by this helper.
function getLegacyTxReq(tx) {
  let txData;
  try {
    txData = {
      nonce: `0x${tx.nonce.toString('hex')}` || 0,
      gasLimit: `0x${tx.gasLimit.toString('hex')}`,
      to: tx.to ? tx.to.toString('hex') : null, // null for contract deployments
      value: `0x${tx.value.toString('hex')}`,
      data: tx.data.length === 0 ? null : `0x${tx.data.toString('hex')}`,
    };
    switch (tx._type) {
      case 2: // eip1559
        if (
          tx.maxPriorityFeePerGas === null ||
          tx.maxFeePerGas === null ||
          tx.maxPriorityFeePerGas === undefined ||
          tx.maxFeePerGas === undefined
        )
          throw new Error(
            '`maxPriorityFeePerGas` and `maxFeePerGas` must be included for EIP1559 transactions.'
          );
        txData.maxPriorityFeePerGas = `0x${tx.maxPriorityFeePerGas.toString(
          'hex'
        )}`;
        txData.maxFeePerGas = `0x${tx.maxFeePerGas.toString('hex')}`;
        txData.accessList = tx.accessList || [];
        txData.type = 2;
        break;
      case 1: // eip2930
        txData.accessList = tx.accessList || [];
        txData.gasPrice = `0x${tx.gasPrice.toString('hex')}`;
        txData.type = 1;
        break;
      default:
        // legacy
        txData.gasPrice = `0x${tx.gasPrice.toString('hex')}`;
        txData.type = null;
        break;
    }
  } catch (err) {
    throw new Error(`Failed to build transaction.`);
  }
  return txData;
}

async function httpRequest(url) {
  const resp = await window.fetch(url);
  if (resp.ok) {
    return await resp.text();
  } else {
    throw new Error('Failed to make request: ', resp.status);
  }
}

LatticeKeyring.type = keyringType;
export default LatticeKeyring;
