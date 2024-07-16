import { useEffect, useMemo, useState } from 'react';

import { DBK_CHAIN_BRIDGE_CONTRACT, DBK_CHAIN_ID } from '@/constant';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useWallet } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import { findChain } from '@/utils/chain';
import { DbkBridgeHistoryItem } from '@rabby-wallet/rabby-api/dist/types';
import { useMemoizedFn, useRequest } from 'ahooks';
import { message } from 'antd';
import BigNumber from 'bignumber.js';
import { getContract, parseEther } from 'viem';
import { getWithdrawals } from 'viem/op-stack';
import { DbkBridgeStatus, dbk } from '../../../utils';
import { useCreateViemClient } from './useCreateViemClient';
import { l1StandardBridgeABI } from '@eth-optimism/contracts-ts';

export const useDbkChainBridge = ({
  action,
  clientL1,
  clientL2,
}: {
  action: 'deposit' | 'withdraw';
  clientL1: ReturnType<typeof useCreateViemClient>['clientL1'];
  clientL2: ReturnType<typeof useCreateViemClient>['clientL2'];
}) => {
  const ethChain = findChain({
    id: 1,
  })!;

  const dbkChain = findChain({
    id: DBK_CHAIN_ID,
  })!;

  const [fromChain, setFromChain] = useState(ethChain);
  const [targetChain, setTargetChain] = useState(dbkChain);

  const wallet = useWallet();

  const [payAmount, setPayAmount] = useState('');
  const account = useCurrentAccount();

  const buildInitiateWithdrawal = useMemoizedFn(async () => {
    try {
      const args = await clientL1.buildInitiateWithdrawal({
        account: account!.address as any,
        to: account!.address as any,
        value: parseEther(payAmount),
      });
      return args;
    } catch (e) {
      console.error(e);
      return {
        account: account!.address as any,
        request: {
          data: undefined,
          // https://github.com/superbridgeapp/superbridge-app/blob/main/apps/bridge/hooks/use-transaction-args/withdraw-args/use-optimism-withdraw-args.ts#L58
          gas: BigInt(200_000),
          to: account!.address as any,
          value: parseEther(payAmount),
        },
      };
    }
  });

  const buildDepositTransactionGas = useMemoizedFn(async () => {
    try {
      const args = await clientL2.buildDepositTransaction({
        account: (account!.address as unknown) as `0x${string}`,
        mint: parseEther(payAmount),
        to: (account!.address as unknown) as `0x${string}`,
      });
      return args.request.gas;
    } catch (e) {
      console.error(e);
      return BigInt(200_000);
    }
  });

  const _handleDeposit = useMemoizedFn(async () => {
    if (!account?.address) {
      return;
    }
    try {
      const l2Gas = await buildDepositTransactionGas();
      const contract = getContract({
        abi: l1StandardBridgeABI,
        address: DBK_CHAIN_BRIDGE_CONTRACT,
        client: clientL1,
      });
      const hash = await contract.write.depositETH([Number(l2Gas), '0x'], {
        account: account.address as `0x${string}`,
        value: parseEther(payAmount),
        gas: undefined,
      });

      if (hash) {
        await wallet.openapi.createDbkBridgeHistory({
          user_addr: account.address,
          from_chain_id: fromChain.serverId,
          to_chain_id: targetChain.serverId,
          tx_id: hash,
          from_token_amount: +payAmount,
        });
      }
      window.close();
    } catch (e) {
      console.error(e);
      const msg = 'details' in e ? e.details : e.message;
      message.error(msg);
    }
  });

  const _handleWithdraw = useMemoizedFn(async () => {
    if (!account?.address) {
      return;
    }
    try {
      const args = await buildInitiateWithdrawal();
      const hash = await clientL2.initiateWithdrawal({
        ...args,
        gas: null,
      });
      if (hash) {
        await wallet.openapi.createDbkBridgeHistory({
          user_addr: account.address,
          from_chain_id: fromChain.serverId,
          to_chain_id: targetChain.serverId,
          tx_id: hash,
          from_token_amount: +payAmount,
        });
      }
      window.close();
    } catch (e) {
      console.error(e);
      const msg = 'details' in e ? e.details : e.message;
      message.error(msg);
    }
  });

  const { runAsync: handleDeposit, loading: isDepositSubmitting } = useRequest(
    _handleDeposit,
    {
      manual: true,
    }
  );
  const {
    runAsync: handleWithdraw,
    loading: isWithdrawSubmitting,
  } = useRequest(_handleWithdraw, {
    manual: true,
  });

  const handleWithdrawStep = useMemoizedFn(
    async (item: DbkBridgeHistoryItem, status: DbkBridgeStatus) => {
      try {
        if (status === 'ready-to-prove') {
          const l2Hash = item.tx_id;
          const receipt = await clientL2.getTransactionReceipt({
            hash: l2Hash as `0x${string}`,
          });
          const { output, withdrawal } = await clientL1.waitToProve({
            receipt,
            targetChain: clientL2.chain as any,
          });

          // 2. Build parameters to prove the withdrawal on the L2.
          const args = await clientL2.buildProveWithdrawal({
            account: (account!.address as unknown) as `0x${string}`,
            output,
            withdrawal,
          });

          // 3. Prove the withdrawal on the L1.
          const hash = await clientL1.proveWithdrawal({
            // todo: check why ts error
            ...(args as any),
            gas: null,
          });

          window.close();
        } else if (status === 'ready-to-finalize') {
          const l2Hash = item.tx_id as `0x${string}`;
          const receipt = await clientL2.getTransactionReceipt({
            hash: l2Hash,
          });

          // (Shortcut) Get withdrawals from receipt in Step 3.
          const [withdrawal] = getWithdrawals(receipt);

          // 2. Finalize the withdrawal.
          const hash = await clientL1.finalizeWithdrawal({
            account: (account!.address as unknown) as `0x${string}`,
            targetChain: clientL2.chain as any,
            withdrawal,
            gas: null,
          });

          window.close();
        }
      } catch (e) {
        console.error(e);
        const msg = 'details' in e ? e.details : e.message;
        message.error(msg);
      }
    }
  );

  const handleSubmit = useMemoizedFn(() => {
    if (action === 'deposit') {
      handleDeposit();
    } else {
      handleWithdraw();
    }
  });

  const { data: payToken } = useRequest(
    async () => {
      if (!account?.address || !fromChain?.serverId) {
        return;
      }

      return wallet.openapi.getToken(
        account.address,
        fromChain.serverId,
        fromChain.nativeTokenAddress
      );
    },
    {
      refreshDeps: [fromChain.serverId],
    }
  );

  const fetchGasPrice = useMemoizedFn(async (serverId: string) => {
    const marketGas = await wallet.openapi.gasMarket(serverId);
    const selectedGasPice = marketGas.find((item) => item.level === 'slow')
      ?.price;
    if (selectedGasPice) {
      return Number(selectedGasPice / 1e9);
    }
  });

  const { data: l1GasPrice } = useRequest(() =>
    fetchGasPrice(ethChain.serverId)
  );

  const { data: l2GasPrice } = useRequest(() =>
    fetchGasPrice(dbkChain.serverId)
  );

  const { data: l1DepositGas } = useRequest(
    async () => {
      const gas = await clientL1.estimateDepositTransactionGas({
        account: account!.address as any,
        request: {
          gas: 21_000n,
          mint: parseEther(payAmount || '0'),
          to: (account!.address as unknown) as `0x${string}`,
        },
        targetChain: dbk,
      });
      return gas;
    },
    {
      debounceWait: 500,
      refreshDeps: [payAmount],
    }
  );

  const { data: l2WithdrawGas } = useRequest(
    async () => {
      const gas = await clientL2.estimateInitiateWithdrawalGas({
        account: account!.address as any,
        request: {
          gas: 21_000n,
          to: account!.address as any,
          value: parseEther(payAmount || '0'),
        },
      });
      return gas;
    },
    {
      debounceWait: 500,
      refreshDeps: [payAmount],
    }
  );

  const depositGasFee = useMemo(() => {
    if (!l1GasPrice || !l1DepositGas || !payToken?.price) {
      return;
    }
    return new BigNumber(l1GasPrice)
      .multipliedBy(l1DepositGas.toString())
      .multipliedBy(payToken.price)
      .dividedBy(1e9)
      .toNumber();
  }, [l1DepositGas, l1GasPrice, payToken?.price]);

  const withdrawGasFee1 = useMemo(() => {
    if (!l2GasPrice || !l2WithdrawGas || !payToken?.price) {
      return;
    }
    return new BigNumber(l2GasPrice)
      .multipliedBy(l2WithdrawGas.toString())
      .multipliedBy(payToken.price)
      .dividedBy(1e9)
      .toNumber();
  }, [l2GasPrice, l2WithdrawGas, payToken?.price]);

  const withdrawProveGasFee = useMemo(() => {
    if (!l1GasPrice || !payToken?.price) {
      return;
    }
    return new BigNumber(l1GasPrice)
      .multipliedBy(206529)
      .multipliedBy(payToken.price)
      .dividedBy(1e9)
      .toNumber();
  }, [l1GasPrice, payToken?.price]);

  const withdrawFinalizeGasFee = useMemo(() => {
    if (!l1GasPrice || !payToken?.price) {
      return;
    }
    return new BigNumber(l1GasPrice)
      .multipliedBy(455939)
      .multipliedBy(payToken.price)
      .dividedBy(1e9)
      .toNumber();
  }, [l1GasPrice, payToken?.price]);

  useEffect(() => {
    if (action === 'deposit') {
      setTargetChain(dbkChain);
      setFromChain(ethChain);
      setPayAmount('');
    } else {
      setTargetChain(ethChain);
      setFromChain(dbkChain);
      setPayAmount('');
    }
  }, [action]);

  const extraInfo = {
    toAddress: account?.address,
    receiveAmount: payAmount,
    receiveTokenSymbol: payToken ? getTokenSymbol(payToken) : '',
    completeTime: action === 'deposit' ? '~ 10 minutes' : '~ 7 days',
    gasFee: action === 'deposit' ? depositGasFee : withdrawGasFee1,
  };

  return {
    fromChain,
    targetChain,
    extraInfo,
    handleSubmit,
    handleDeposit,
    handleWithdraw,
    payAmount,
    payToken,
    setPayAmount,
    handleWithdrawStep,
    isDepositSubmitting,
    isWithdrawSubmitting,
    withdrawFinalizeGasFee,
    withdrawGasFee1,
    withdrawProveGasFee,
  };
};
