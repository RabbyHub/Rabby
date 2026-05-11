import { ethers, Contract } from 'ethers';
import { getContractFactory, predeploys } from '@eth-optimism/contracts';
import buildUnserializedTransaction from '@/utils/optimism/buildUnserializedTransaction';
import { CHAINS_ENUM, OP_STACK_ENUMS } from 'consts';
import BigNumber from 'bignumber.js';
import { findChain } from './chain';

const ensureL1FeeTxParamsChainId = (txParams: any, chain: CHAINS_ENUM) => {
  const chainInfo = findChain({ enum: chain });
  const chainId = Number(txParams?.chainId);

  if (!chainInfo) {
    return txParams;
  }

  if (Number.isInteger(chainId) && chainId > 0) {
    return txParams;
  }

  return {
    ...txParams,
    chainId: chainInfo.id,
  };
};

// https://docs.scroll.io/en/developers/transaction-fees-on-scroll/#calculating-the-l1-data-fee-with-gas-oracle
export const scrollL1FeeEstimate = async (
  provider: ethers.providers.Web3Provider,
  txParams: any
) => {
  const signer = provider.getSigner();
  const oracleContract = new Contract(
    '0x5300000000000000000000000000000000000002',
    [
      {
        type: 'constructor',
        stateMutability: 'nonpayable',
        inputs: [{ type: 'address', name: '_owner', internalType: 'address' }],
      },
      {
        type: 'function',
        stateMutability: 'view',
        outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
        name: 'getL1Fee',
        inputs: [{ type: 'bytes', name: '_data', internalType: 'bytes' }],
      },
    ],
    signer
  );
  const serializedTransaction = buildUnserializedTransaction({
    txParams,
  }).serialize();
  const res = await oracleContract.getL1Fee(serializedTransaction);
  return res.toHexString();
};

// https://community.optimism.io/docs/developers/build/transaction-fees/#the-l1-data-fee
export const opStackL1FeeEstimate = async (
  provider: ethers.providers.Web3Provider,
  txParams: any
) => {
  const signer = provider.getSigner();
  const OVMGasPriceOracle = getContractFactory('OVM_GasPriceOracle').attach(
    predeploys.OVM_GasPriceOracle
  );
  const abi = JSON.parse(
    OVMGasPriceOracle.interface.format(ethers.utils.FormatTypes.json) as string
  );

  const contract = new Contract(OVMGasPriceOracle.address, abi, signer);
  const serializedTransaction = buildUnserializedTransaction({
    txParams,
  }).serialize();

  const res = await contract.getL1Fee(serializedTransaction);
  const bn = new BigNumber(res.toHexString()).times(1.1); // Add 10% buffer for L1 data fee
  return `0x${bn.toString(16)}`;
};

// https://docs.citrea.xyz/advanced/fee-model#l1-fee-rate-source
export const citreaL1FeeEstimate = async (
  provider: ethers.providers.Web3Provider,
  txParams: any
) => {
  try {
    const [diffSizeRes, latestBlock] = await Promise.all([
      provider.send('eth_estimateDiffSize', [txParams]),
      provider.send('eth_getBlockByNumber', ['latest', false]),
    ]);

    const l1DiffSize = diffSizeRes?.l1DiffSize;
    const l1FeeRate = latestBlock?.l1FeeRate;

    if (!l1DiffSize || !l1FeeRate) {
      return '0x0';
    }

    const l1Fee = new BigNumber(l1DiffSize)
      .times(l1FeeRate)
      .integerValue(BigNumber.ROUND_CEIL);
    return `0x${l1Fee.toString(16)}`;
  } catch {
    return '0x0';
  }
};

export const estimateL1Fee = ({
  txParams,
  chain,
  provider,
}: {
  txParams: any;
  chain: CHAINS_ENUM;
  provider: ethers.providers.Web3Provider;
}): Promise<string> => {
  const normalizedTxParams = ensureL1FeeTxParamsChainId(txParams, chain);

  if (chain.toLowerCase() === 'citrea') {
    return citreaL1FeeEstimate(provider, normalizedTxParams);
  }
  if (OP_STACK_ENUMS.includes(chain)) {
    return opStackL1FeeEstimate(provider, normalizedTxParams);
  } else if (chain === CHAINS_ENUM.SCRL) {
    return scrollL1FeeEstimate(provider, normalizedTxParams);
  }
  return Promise.resolve('0x0');
};
