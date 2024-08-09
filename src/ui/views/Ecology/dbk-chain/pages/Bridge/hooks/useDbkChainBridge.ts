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
import { getContract, parseEther, WriteContractParameters } from 'viem';
import { getWithdrawals } from 'viem/op-stack';
import { DbkBridgeStatus, dbk } from '../../../utils';
import { useCreateViemClient } from './useCreateViemClient';
import {
  l1StandardBridgeABI,
  optimismPortalABI,
} from '@eth-optimism/contracts-ts';
import { writeContract } from 'viem/actions';

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

  const _handleDeposit = useMemoizedFn(async () => {
    if (!account?.address) {
      return;
    }
    try {
      const contract = getContract({
        abi: l1StandardBridgeABI,
        address: DBK_CHAIN_BRIDGE_CONTRACT,
        client: clientL1,
      });
      const hash = await contract.write.depositETH([200_000, '0x'], {
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
      const hash = await clientL2.initiateWithdrawal({
        account: account.address as `0x${string}`,
        request: {
          // https://github.com/superbridgeapp/superbridge-app/blob/main/apps/bridge/hooks/use-transaction-args/withdraw-args/use-optimism-withdraw-args.ts#L58
          gas: BigInt(200_000),
          to: account.address as `0x${string}`,
          value: parseEther(payAmount),
        },
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
          // viem has a bug, it will ignore gas
          // const hash = await clientL1.finalizeWithdrawal({
          //   account: (account!.address as unknown) as `0x${string}`,
          //   targetChain: clientL2.chain as any,
          //   withdrawal,
          //   gas: null
          // });

          await writeContract(clientL1, {
            account: (account!.address as unknown) as `0x${string}`,
            abi: optimismPortalABI,
            address:
              clientL2.chain?.contracts?.portal?.[clientL1.chain.id].address,
            chain: clientL1.chain,
            functionName: 'finalizeWithdrawalTransaction',
            args: [withdrawal],
            gas: BigInt(700_000),
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
    const selectedGasPice = marketGas.find((item) => item.level === 'normal');
    return selectedGasPice;
  });

  const { data: l1GasLevel } = useRequest(() =>
    fetchGasPrice(ethChain.serverId)
  );

  const { data: l2GasLevel } = useRequest(() =>
    fetchGasPrice(dbkChain.serverId)
  );

  const { data: l1DepositGas } = useRequest(
    async () => {
      if (!l1GasLevel?.price || action !== 'deposit') {
        return;
      }
      const gas = await clientL1.estimateContractGas({
        abi: l1StandardBridgeABI,
        address: DBK_CHAIN_BRIDGE_CONTRACT,
        functionName: 'depositETH',
        args: [200_000, '0x'],
        account: account!.address as `0x${string}`,
        value: parseEther(payAmount),
        maxFeePerGas: BigInt(l1GasLevel.price),
        maxPriorityFeePerGas: BigInt(l1GasLevel.price),
      });
      return gas;
    },
    {
      debounceWait: 500,
      refreshDeps: [payAmount, action],
    }
  );

  const { data: l2WithdrawGas } = useRequest(
    async () => {
      if (action !== 'withdraw') {
        return;
      }
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
      refreshDeps: [payAmount, action],
    }
  );

  const depositGasFee = useMemo(() => {
    if (!l1GasLevel?.price || !l1DepositGas || !payToken?.price) {
      return;
    }
    return new BigNumber(l1GasLevel?.price)
      .multipliedBy(l1DepositGas.toString())
      .multipliedBy(payToken.price)
      .dividedBy(1e18)
      .toNumber();
  }, [l1DepositGas, l1GasLevel?.price, payToken?.price]);

  const withdrawGasFee1 = useMemo(() => {
    if (!l2GasLevel?.price || !l2WithdrawGas || !payToken?.price) {
      return;
    }
    return new BigNumber(l2GasLevel?.price)
      .multipliedBy(l2WithdrawGas.toString())
      .multipliedBy(payToken.price)
      .dividedBy(1e18)
      .toNumber();
  }, [l2GasLevel?.price, l2WithdrawGas, payToken?.price]);

  const withdrawProveGasFee = useMemo(() => {
    if (!l1GasLevel?.price || !payToken?.price) {
      return;
    }
    return new BigNumber(l1GasLevel.price)
      .multipliedBy(206529)
      .multipliedBy(payToken.price)
      .dividedBy(1e18)
      .toNumber();
  }, [l1GasLevel?.price, payToken?.price]);

  const withdrawFinalizeGasFee = useMemo(() => {
    if (!l1GasLevel?.price || !payToken?.price) {
      return;
    }
    return new BigNumber(l1GasLevel?.price)
      .multipliedBy(270_000)
      .multipliedBy(payToken.price)
      .dividedBy(1e18)
      .toNumber();
  }, [l1GasLevel?.price, payToken?.price]);

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
