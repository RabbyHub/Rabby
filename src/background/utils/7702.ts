import { Hex, numberToHex, trim } from 'viem';

/**
 * Minimum gas limit required for EIP-7702 revoke operations (setting delegation to the zero address).
 * This value includes intrinsic gas, authorization overhead, and a safety margin to prevent
 * out-of-gas reverts when clearing delegation.
 */
export const EIP7702_REVOKE_MIN_GAS_LIMIT = 60_000n;

/**
 * Removes leading zero bytes from a hex string.
 * Uses viem's `trim` utility for reliable byte-level trimming and better edge-case handling.
 */
export function removeLeadingZeroes(value: Hex | undefined): Hex | undefined {
  if (!value) return value;
  return trim(value, { dir: 'left' });
}

/**
 * Returns a gas limit (as hex) that is guaranteed to be at least `EIP7702_REVOKE_MIN_GAS_LIMIT`.
 * Useful when preparing revoke transactions to avoid under-gas reverts.
 */
export const getEIP7702MiniGasLimit = (gaslimit: number | string | bigint | undefined): Hex => {
  const input = gaslimit != null ? BigInt(gaslimit) : 0n;
  const finalGas = input >= EIP7702_REVOKE_MIN_GAS_LIMIT ? input : EIP7702_REVOKE_MIN_GAS_LIMIT;

  return numberToHex(finalGas);
};