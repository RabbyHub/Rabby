import { Contract } from 'ethers';
import { numberToHex } from 'web3-utils';
import { approvalABI } from 'consts';

export async function getAllow(
  owner: string,
  spender: string,
  erc20: string,
  value: number | string,
  infinite?: boolean
) {
  if (value && value < 0) {
    throw Error('Value must be positive');
  }

  if (typeof value === 'number') {
    value = numberToHex(value);
  }

  if (infinite) {
    value =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  }

  const contract = new Contract(erc20, approvalABI);
  const res = await contract.populateTransaction.approve(
    spender,
    value?.toString()
  );

  return {
    ...res,
    from: owner,
  };
}
