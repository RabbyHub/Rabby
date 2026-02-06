/**
 * @description 构建交易相关函数:
 * supply、withdraw、borrow、repay、collateralSwitch、manageEmode等操作的tx构建
 * 但不包含approve交易
 */

import {
  BaseDebtToken,
  ChainId,
  DebtSwitchAdapterService,
  ERC20Service,
  Pool,
  PoolBundle,
} from '@aave/contract-helpers';
import BigNumber from 'bignumber.js';
import { constants, ethers } from 'ethers';
import { MAX_UINT_AMOUNT, referralCode } from './constant';

export const ZERO_PERMIT = {
  value: '0',
  deadline: '0',
  v: 0,
  r: constants.HashZero,
  s: constants.HashZero,
};

export enum InterestRate {
  None = 'None',
  Stable = 'Stable',
  Variable = 'Variable',
}

export const optimizedPath = (currentChainId?: ChainId) => {
  if (!currentChainId) {
    return false;
  }
  return (
    currentChainId === ChainId.arbitrum_one ||
    currentChainId === ChainId.optimism
    // ||
    // currentChainId === ChainId.optimism_kovan
  );
};

export const buildSupplyTx = async ({
  poolBundle,
  amount,
  address,
  reserve,
  useOptimizedPath,
}: {
  poolBundle: PoolBundle;
  amount: string;
  address: string;
  reserve: string;
  useOptimizedPath?: boolean;
}) => {
  return poolBundle.supplyTxBuilder.generateTxData({
    user: address,
    reserve: reserve,
    amount: amount,
    useOptimizedPath: !!useOptimizedPath,
    referralCode,
  });
};

export const buildWithdrawTx = async ({
  pool,
  amount,
  address,
  reserve,
  aTokenAddress,
  useOptimizedPath,
}: {
  pool: Pool;
  amount: string;
  address: string;
  reserve: string;
  aTokenAddress: string;
  useOptimizedPath?: boolean;
}) => {
  return pool.withdraw({
    user: address,
    reserve,
    amount,
    aTokenAddress,
    useOptimizedPath: !!useOptimizedPath,
  });
};

export const buildBorrowTx = async ({
  poolBundle,
  amount,
  address,
  reserve,
  debtTokenAddress,
  useOptimizedPath,
}: {
  poolBundle: PoolBundle;
  amount: string;
  address: string;
  reserve: string;
  debtTokenAddress: string;
  useOptimizedPath?: boolean;
}) => {
  return poolBundle.borrowTxBuilder.generateTxData({
    user: address,
    amount: amount,
    reserve: reserve,
    debtTokenAddress,
    interestRateMode: InterestRate.Variable,
    useOptimizedPath: !!useOptimizedPath,
    referralCode,
  });
};

export const buildRepayTx = async ({
  poolBundle,
  amount,
  address,
  reserve,
  useOptimizedPath,
  repayWithATokens,
  encodedTxData,
}: {
  poolBundle: PoolBundle;
  amount: string;
  address: string;
  reserve: string;
  useOptimizedPath?: boolean;
  repayWithATokens?: boolean;
  encodedTxData?: string;
}) => {
  if (repayWithATokens) {
    return poolBundle.repayWithATokensTxBuilder.generateTxData({
      user: address,
      reserve,
      amount,
      rateMode: InterestRate.Variable,
      useOptimizedPath: !!useOptimizedPath,
      encodedTxData,
    });
  }
  return poolBundle.repayTxBuilder.generateTxData({
    user: address,
    reserve,
    amount,
    interestRateMode: InterestRate.Variable,
    useOptimizedPath: !!useOptimizedPath,
  });
};

export const collateralSwitchTx = async ({
  pool,
  address,
  reserve,
  usageAsCollateral,
  useOptimizedPath,
}: {
  pool: Pool;
  address: string;
  reserve: string;
  usageAsCollateral: boolean;
  useOptimizedPath?: boolean;
}) => {
  return pool.setUsageAsCollateral({
    user: address,
    reserve,
    usageAsCollateral,
    useOptimizedPath: !!useOptimizedPath,
  });
};

export const buildManageEmodeTx = async ({
  pool,
  address,
  categoryId,
}: {
  pool: Pool;
  address: string;
  categoryId: number;
}) => {
  // categoryId如果是0，则表示取消E-Mode
  return pool.setUserEMode({
    user: address,
    categoryId,
  });
};

export const generateApproveDelegation = async ({
  provider,
  address,
  delegatee,
  debtTokenAddress,
  amount,
  decimals,
}: {
  provider: ethers.providers.Web3Provider;
  address: string;
  delegatee: string;
  debtTokenAddress: string;
  amount: string; // wei
  decimals: number;
}): Promise<ethers.PopulatedTransaction | undefined> => {
  const tokenERC20Service = new ERC20Service(provider);
  const debtTokenService = new BaseDebtToken(provider, tokenERC20Service);

  const approvedAmount = await debtTokenService.approvedDelegationAmount({
    user: address,
    delegatee,
    debtTokenAddress,
  });
  const approvedAmountBn = new BigNumber(
    approvedAmount.toString()
  ).multipliedBy(10 ** decimals);
  const requiredAmountBn = new BigNumber(amount);

  if (approvedAmountBn.gte(requiredAmountBn)) {
    return undefined;
  }

  return debtTokenService.generateApproveDelegationTxData({
    user: address,
    delegatee,
    debtTokenAddress,
    amount,
  });
};

export const buildDebtSwitchTx = ({
  provider,
  address,
  fromAddress,
  rawAmount,
  isMaxSelected,
  debtSwitchAdapterAddress,
  maxNewDebtAmount,
  txCalldata,
  augustus,
  newAssetDebtToken,
  newAssetUnderlying,
}: {
  provider: ethers.providers.Web3Provider;
  address: string;
  fromAddress: string;
  rawAmount: string;
  maxNewDebtAmount: string;
  isMaxSelected: boolean;
  debtSwitchAdapterAddress: string;
  txCalldata: string;
  augustus: string;
  newAssetDebtToken: string;
  newAssetUnderlying: string;
}) => {
  const debtSwitchService = new DebtSwitchAdapterService(
    provider,
    debtSwitchAdapterAddress
  );

  const debtSwitchTx = debtSwitchService.debtSwitch({
    user: address,
    debtAssetUnderlying: fromAddress,
    debtRepayAmount: isMaxSelected ? MAX_UINT_AMOUNT : rawAmount,
    debtRateMode: 2, // variable
    newAssetUnderlying,
    newAssetDebtToken,
    maxNewDebtAmount,
    extraCollateralAmount: '0',
    extraCollateralAsset: '0x0000000000000000000000000000000000000000',
    repayAll: isMaxSelected,
    txCalldata,
    augustus,
    creditDelegationPermit: ZERO_PERMIT,
    collateralPermit: ZERO_PERMIT,
  });
  return debtSwitchTx;
};

export const buildRepayWithCollateralTx = ({
  pool,
  address,
  fromUnderlyingAsset,
  fromATokenAddress,
  toUnderlyingAsset,
  repayWithAmount,
  repayAmount,
  repayAllDebt,
  rateMode,
  useFlashLoan,
  swapCallData,
  augustus,
}: {
  pool: Pool;
  address: string;
  fromUnderlyingAsset: string;
  fromATokenAddress: string;
  toUnderlyingAsset: string;
  repayWithAmount: string;
  repayAmount: string;
  repayAllDebt: boolean;
  rateMode: InterestRate;
  useFlashLoan: boolean;
  swapCallData: string;
  augustus: string;
}) => {
  return pool.paraswapRepayWithCollateral({
    user: address,
    fromAsset: fromUnderlyingAsset,
    fromAToken: fromATokenAddress,
    assetToRepay: toUnderlyingAsset,
    repayWithAmount,
    repayAmount,
    repayAllDebt,
    flash: useFlashLoan,
    swapAndRepayCallData: swapCallData,
    augustus,
    permitSignature: undefined,
    rateMode,
  });
};
