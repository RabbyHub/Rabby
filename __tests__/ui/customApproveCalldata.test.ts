import { ethers } from 'ethers';
import { getCustomTxParamsData, getTokenData } from '@/ui/utils/transaction';

const spender = '0x1111111254EEB25477B68fb85Ed929f73A960582';
const erc20 = new ethers.utils.Interface([
  'function approve(address spender, uint256 amount)',
  'function transfer(address to, uint256 amount)',
  'function approveAndCall(address spender, uint256 amount, bytes data)',
]);

describe('custom approve calldata', () => {
  it('parses ERC-20 approve and transfer calls', () => {
    const approve = getTokenData(
      erc20.encodeFunctionData('approve', [spender, 5])
    );
    expect(approve?.name).toBe('approve');
    expect(approve?.args[0]).toBe(spender);

    const transfer = getTokenData(
      erc20.encodeFunctionData('transfer', [spender, 5])
    );
    expect(transfer?.name).toBe('transfer');
  });

  it('rewrites the amount of an approve call and keeps the spender', () => {
    const data = erc20.encodeFunctionData('approve', [
      spender,
      ethers.constants.MaxUint256,
    ]);
    const custom = getCustomTxParamsData(data, {
      customPermissionAmount: '1.5',
      decimals: 6,
    });
    expect(custom).toBe(
      erc20.encodeFunctionData('approve', [spender, 1500000])
    );
  });

  it('rejects calls it cannot safely rewrite', () => {
    const data = erc20.encodeFunctionData('approveAndCall', [
      spender,
      5,
      '0x1234',
    ]);
    expect(() =>
      getCustomTxParamsData(data, { customPermissionAmount: '1', decimals: 18 })
    ).toThrow('Invalid data');
  });
});
