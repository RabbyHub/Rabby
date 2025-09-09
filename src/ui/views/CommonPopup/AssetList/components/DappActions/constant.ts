export const BLACKLIST_METHODS = [
  'transfer',
  'approve',
  'increaseAllowance',
  'permit',
  'transferOwnership',
  'transferOwner',
  'signalTransfer',
  'setApproveToAll',
];

export const WHITELIST_ADDRESS = [
  '0x0000000000000000000000000000000000000000',
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
];
export const WHITELIST_SPENDER = [
  { chain: 'eth', address: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d' },
  { chain: 'base', address: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24' },
  { chain: 'arb', address: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24' },
  { chain: 'matic', address: '0xedf6066a2b290c185783862c7f4776a2c8077ad1' },
  { chain: 'op', address: '0x4a7b5da61326a6379179b40d00f57e5bbdc962c2' },
  { chain: 'bsc', address: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24' },
  { chain: 'uni', address: '0x284f11109359a7e1306c3e447ef14d38400063ff' },
  { chain: 'world', address: '0x541ab7c31a119441ef3575f6973277de0ef460bd' },
  { chain: 'avax', address: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24' },
  { chain: 'zora', address: '0xa00f34a632630efd15223b1968358ba4845beec7' },
  { chain: 'blast', address: '0xbb66eb1c5e875933d44dae661dbd80e5d9b03035' },
  { chain: 'eth', address: '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1' },
  { chain: 'eth', address: '0xe39682c3c44b73285a2556d4869041e674d1a6b7' },
];
