// The Ledger keyring throws this when the Ethereum app refused a signature
// with 0x6a80 and its configuration reports Blind signing turned off. The UI
// matches on it to tell the user which device setting to change.
export const LEDGER_BLIND_SIGNING_DISABLED_ERROR =
  'Ledger: Blind signing is disabled in the Ethereum app';
