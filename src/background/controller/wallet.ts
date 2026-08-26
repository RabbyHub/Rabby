// RESTORED: `brand` parameter added back to ensure Keystone and OneKey imports are properly branded
  unlockHardwareAccount = async (keyring, indexes, keyringId, brand?) => {
    let keyringInstance: any = null;
    try {
      keyringInstance = this.#getKeyringByType(keyring);
    } catch (e) {
      // NOTHING
    }
    if (!keyringInstance && keyringId !== null && keyringId !== undefined) {
      await keyringService.addKeyring(stashKeyrings[keyringId]);
      keyringInstance = stashKeyrings[keyringId];
    }
    
    // Explicitly apply the specific hardware brand to the generic keyring instance.
    if (brand && keyringInstance?.setCurrentBrand) {
      keyringInstance.setCurrentBrand(brand);
    }
    
    for (let i = 0; i < indexes.length; i++) {
      keyringInstance!.setAccountToUnlock(indexes[i]);
      await keyringService.addNewAccount(keyringInstance);
    }

    return this._setCurrentAccountFromKeyring(keyringInstance, -1);
  };