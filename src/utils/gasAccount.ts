export const INVALID_GAS_ACCOUNT_SIGN_TEXT = 'Invalid GasAccount sign text';

// Errors from the background arrive as plain { message } objects.
export const isInvalidGasAccountSignTextError = (error: unknown) =>
  (error as { message?: unknown } | undefined)?.message ===
  INVALID_GAS_ACCOUNT_SIGN_TEXT;

const GAS_ACCOUNT_SIGN_TEXT_RE = /^Gas Account wants you to sign in with your \naddress:(0x[0-9a-fA-F]{40})\n/;

// The sign text comes from the server; refuse to personal_sign anything that
// isn't the Gas Account login message for this address (e.g. a Safe tx hash).
export const assertGasAccountSignText = (text: unknown, address: string) => {
  const match =
    typeof text === 'string' ? GAS_ACCOUNT_SIGN_TEXT_RE.exec(text) : null;
  if (!match || match[1].toLowerCase() !== address.toLowerCase()) {
    throw new Error(INVALID_GAS_ACCOUNT_SIGN_TEXT);
  }
  return text as string;
};
