import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import crypto from 'crypto-browserify';
import { approvalABI } from 'consts';

export interface EthContract {
  addr: string;
  abi: AbiItem[];
  network: string;
}

const Contracts: Map<string, EthContract> = new Map();
export function getContract(
  contractAddr: string,
  abi: string,
  network?: string
): EthContract {
  const contractKey = `${contractAddr.toLowerCase()}:${crypto
    .createHash('md5')
    .update(JSON.stringify(abi))
    .digest('hex')}`;
  const resContract = {
    addr: contractAddr,
    abi: JSON.parse(abi),
    network: network || 'mainnet',
  };
  const cacheContract = Contracts.get(contractKey);
  if (cacheContract) {
    return cacheContract;
  }
  Contracts.set(contractKey, resContract);
  return resContract;
}

const web3Providers: {
  [index: string]: Web3;
} = {};

export function getWeb3(network?: string, archieve?: boolean) {
  if (network === 'mainnet') {
    network = undefined;
  }
  const providerName = network ?? (archieve ? 'archieve' : 'latest');
  const propertyName = `web3${providerName}`;
  if (!web3Providers[propertyName]) {
    web3Providers[propertyName] = new Web3(Web3.givenProvider);
  }
  return web3Providers[propertyName];
}

const Web3Contracts: Map<string, Contract> = new Map();

export async function callContractFunc(
  contract: EthContract,
  func: string,
  params: any[],
  blockNumber?: number,
  options?: any,
  mode?: string,
  fromAddr?: string
) {
  const web3: Web3 = getWeb3(contract.network, blockNumber !== undefined);

  const contractKey = `${contract.addr.toLowerCase()}:${crypto
    .createHash('md5')
    .update(JSON.stringify(contract.abi))
    .digest('hex')}:${blockNumber ? 'Archieve' : 'Latest'}`;
  let web3Contract = Web3Contracts.get(contractKey);
  if (!web3Contract) {
    web3Contract = new web3.eth.Contract(contract.abi, contract.addr);
    Web3Contracts.set(contractKey, web3Contract);
  }
  if (!mode || mode === 'call') {
    return await web3Contract.methods[func]
      .call(null, ...params)
      .call(options ? options : {}, blockNumber ? blockNumber : 'latest');
  } else if (mode === 'estimateGas') {
    return await web3Contract.methods[func](...params).estimateGas({
      from: fromAddr,
    });
  } else if (mode === 'encodeABI') {
    return web3Contract.methods[func](...params).encodeABI();
  } else {
    throw Error(`Unknown mode ${mode}`);
  }
}

export async function getAllowance(
  owner: string,
  spender: string,
  erc20: string
) {
  const contract = getContract(erc20, approvalABI);
  return await callContractFunc(contract, 'allowance', [owner, spender]);
}

export async function getAllow(
  owner: string,
  spender: string,
  erc20: string,
  gasPrice?: number,
  value?: number | string,
  infinite?: boolean
) {
  if (value && value < 0) {
    throw Error('Value must be positive');
  }
  const web3 = getWeb3();

  if (infinite) {
    value =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  }
  const contract = getContract(erc20, approvalABI);
  const encodeABI = await callContractFunc(
    contract,
    'approve',
    [spender, value],
    undefined,
    undefined,
    'encodeABI',
    owner
  );
  const nonce = await web3.eth.getTransactionCount(owner);

  const transactionParameters: Record<string, any> = {
    gas: '0x186a0', // customizable by user during MetaMask confirmation.
    to: erc20, // Required except during contract publications.
    from: owner, // must match user's active address.
    value: '0x00', // Only required to send ether to the recipient from the initiating external account.
    data: encodeABI, // Optional, but used for defining smart contract creation and interaction.
    nonce,
  };

  if (gasPrice) {
    transactionParameters.gasPrice = '0x' + (gasPrice * 1e9).toString(16);
  }

  return transactionParameters;
}
