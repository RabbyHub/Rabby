import { ethers, Contract } from 'ethers';
import * as optimismContracts from '@eth-optimism/contracts';
import buildUnserializedTransaction from '@/utils/optimism/buildUnserializedTransaction';
import { CHAINS_ENUM, OP_STACK_ENUMS } from 'consts';

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
  const OVMGasPriceOracle = optimismContracts
    .getContractFactory('OVM_GasPriceOracle')
    .attach(optimismContracts.predeploys.OVM_GasPriceOracle);
  const abi = JSON.parse(
    OVMGasPriceOracle.interface.format(ethers.utils.FormatTypes.json) as string
  );

  const contract = new Contract(OVMGasPriceOracle.address, abi, signer);
  const serializedTransaction = buildUnserializedTransaction({
    txParams,
  }).serialize();

  const res = await contract.getL1Fee(serializedTransaction);
  return res.toHexString();
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
  if (OP_STACK_ENUMS.includes(chain)) {
    return opStackL1FeeEstimate(provider, txParams);
  } else if (chain === CHAINS_ENUM.SCRL) {
    return scrollL1FeeEstimate(provider, txParams);
  }
  return Promise.resolve('0x0');
};
