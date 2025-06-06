import BigNumber from 'bignumber.js';
import { Hex, numberToHex } from 'viem';

export const EIP7702RevokeMiniGasLimit = 46000;

export function removeLeadingZeroes(value: Hex | undefined): Hex | undefined {
  if (!value) {
    return value;
  }

  if (value === '0x0') {
    return '0x';
  }

  return (value.replace?.(/^0x(00)+/u, '0x') as Hex) ?? value;
}

export const getEIP7702MiniGasLimit = (gaslimit: number | string) => {
  return new BigNumber(gaslimit || 0).gte(EIP7702RevokeMiniGasLimit)
    ? numberToHex(new BigNumber(gaslimit || 0).toNumber())
    : numberToHex(EIP7702RevokeMiniGasLimit);
};
