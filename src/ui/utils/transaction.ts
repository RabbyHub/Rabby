import abi from 'human-standard-token-abi';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';

const hstInterface = new ethers.utils.Interface(abi);

export function getTokenData(data: string) {
  try {
    return hstInterface.parseTransaction({ data });
  } catch (error) {
    return undefined;
  }
}

export function getTokenAddressParam(
  tokenData: ethers.utils.TransactionDescription
): string {
  const value = tokenData?.args?._to || tokenData?.args?.[0];
  return value?.toString().toLowerCase();
}

export function calcTokenValue(value: string, decimals: number) {
  const multiplier = Math.pow(10, Number(decimals || 0));
  return new BigNumber(String(value)).times(multiplier);
}

export function getCustomTxParamsData(
  data,
  {
    customPermissionAmount,
    decimals,
  }: { customPermissionAmount: string; decimals: number }
) {
  const tokenData = getTokenData(data);

  if (!tokenData) {
    throw new Error('Invalid data');
  }
  let spender = getTokenAddressParam(tokenData);
  if (spender.startsWith('0x')) {
    spender = spender.substring(2);
  }
  const [signature, tokenValue] = data.split(spender);

  if (!signature || !tokenValue) {
    throw new Error('Invalid data');
  } else if (tokenValue.length !== 64) {
    throw new Error(
      'Invalid token value; should be exactly 64 hex digits long (u256)'
    );
  }

  let customPermissionValue = calcTokenValue(
    customPermissionAmount,
    decimals
  ).toString(16);

  if (customPermissionValue.length > 64) {
    throw new Error('Custom value is larger than u256');
  }

  customPermissionValue = customPermissionValue.padStart(
    tokenValue.length,
    '0'
  );
  const customTxParamsData = `${signature}${spender}${customPermissionValue}`;
  return customTxParamsData;
}
