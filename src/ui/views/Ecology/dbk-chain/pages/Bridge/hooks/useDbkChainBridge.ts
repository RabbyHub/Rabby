import React, { useEffect, useMemo, useState } from 'react';

import { DBK_CHAIN_ID } from '@/constant';
import { useCurrentAccount } from '@/ui/hooks/backgroundState/useAccount';
import { useWallet } from '@/ui/utils';
import { getTokenSymbol } from '@/ui/utils/token';
import { findChain } from '@/utils/chain';
import { useMemoizedFn, useRequest } from 'ahooks';
import {
  createWalletClient,
  custom,
  defineChain,
  parseEther,
  publicActions,
} from 'viem';
import { mainnet } from 'viem/chains';
import {
  chainConfig,
  getWithdrawals,
  publicActionsL1,
  publicActionsL2,
  walletActionsL1,
  walletActionsL2,
} from 'viem/op-stack';
import { useCreateViemClient } from './useCreateViemClient';
import { DbkBridgeStatus } from '../../../utils';
import { DbkBridgeHistoryItem } from '@rabby-wallet/rabby-api/dist/types';

export const dbk = defineChain({
  ...chainConfig,
  id: 20240603,
  name: 'DBK Chain',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.mainnet.dbkchain.io/'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://scan.dbkchain.io/' },
  },
  contracts: {
    ...chainConfig.contracts,

    // l2CrossDomainMessenger: {
    //   1: {
    //     address: '0x307c7773097445400d2F2a51D65e38AEa8231868',
    //   },
    // },
    l2OutputOracle: {
      1: {
        address: '0x0341bb689CB8a4c16c61307F4BdA254E1bFD525e',
      },
    },
    // multicall3: {
    //   address: '0xca11bde05977b3631167028862be2a173976ca11',
    //   blockCreated: 5022,
    // },
    portal: {
      [1]: {
        address: '0x63CA00232F471bE2A3Bf3C4e95Bc1d2B3EA5DB92',
        // blockCreated: 17482143,
      },
    },
    l1StandardBridge: {
      [1]: {
        address: '0x28f1b9F457CB51E0af56dff1d11CD6CEdFfD1977',
        // blockCreated: 17482143,
      },
    },
  },
  sourceId: 1,
});

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

  const handleDeposit = useMemoizedFn(async () => {
    if (!account?.address) {
      return;
    }
    try {
      const args = await clientL2.buildDepositTransaction({
        account: (account!.address as unknown) as `0x${string}`,
        mint: parseEther(payAmount),
        to: (account!.address as unknown) as `0x${string}`,
      });

      const hash = await clientL1.depositTransaction(args);
      if (hash) {
        await wallet.openapi.createDbkBridgeHistory({
          user_addr: account.address,
          from_chain_id: fromChain.serverId,
          // todo
          to_chain_id: 'dbk',
          tx_id: hash,
          from_token_amount: +payAmount,
        });
      }
      console.log(hash);
      window.close();

      // const receipt = await clientL1.waitForTransactionReceipt({ hash });

      // const [l2Hash] = getL2TransactionHashes(receipt);
      // const l2Receipt = await clientL2.waitForTransactionReceipt({
      //   hash: l2Hash,
      // });
      // console.log(l2Receipt);
    } catch (e) {
      console.log('????');
      console.error(e);
    }
  });

  const handleWithdraw = useMemoizedFn(async () => {
    if (!account?.address) {
      return;
    }
    const args = await clientL1.buildInitiateWithdrawal({
      account: account!.address as any,
      to: account!.address as any,
      value: parseEther(payAmount),
    });
    const hash = await clientL2.initiateWithdrawal(args);
    if (hash) {
      await wallet.openapi.createDbkBridgeHistory({
        user_addr: account.address,
        // todo
        from_chain_id: 'dbk',
        to_chain_id: 'eth',
        tx_id: hash,
        from_token_amount: +payAmount,
      });
    }
    console.log(hash);
    window.close();
  });

  const handleWithdrawStep = useMemoizedFn(
    async (item: DbkBridgeHistoryItem, status: DbkBridgeStatus) => {
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

        console.log(args);

        // 3. Prove the withdrawal on the L1.
        const hash = await clientL1.proveWithdrawal(args as any);

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
        });

        window.close();
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
      if (fromChain.isTestnet) {
        // todo
        return wallet.getCustomTestnetToken({
          chainId: fromChain.id,
          address: account.address,
          tokenId: fromChain.nativeTokenAddress,
        }) as any;
      } else {
        return wallet.openapi.getToken(
          account.address,
          fromChain.serverId,
          'eth'
        );
      }
    },
    {
      refreshDeps: [fromChain.serverId],
    }
  );

  const { data: gasPrice } = useRequest(
    async () => {
      const chain = fromChain;
      const marketGas = chain?.isTestnet
        ? await wallet.getCustomTestnetGasMarket({
            chainId: chain?.id,
          })
        : await wallet.openapi.gasMarket(chain.serverId);
      const selectedGasPice = marketGas.find((item) => item.level === 'slow')
        ?.price;
      if (selectedGasPice) {
        return Number(selectedGasPice / 1e9);
      }
    },
    {
      refreshDeps: [fromChain.serverId],
    }
  );

  const gasFee = useMemo(() => {
    if (gasPrice != null && payToken?.price != null) {
      return (gasPrice * 21000 * payToken.price) / 1e9;
    }
  }, [gasPrice, payToken]);

  useEffect(() => {
    if (action === 'deposit') {
      setTargetChain(dbkChain);
      setFromChain(ethChain);
    } else {
      setTargetChain(ethChain);
      setFromChain(dbkChain);
    }
  }, [action]);

  const extraInfo = {
    toAddress: account?.address,
    receiveAmount: payAmount,
    receiveTokenSymbol: payToken ? getTokenSymbol(payToken) : '',
    completeTime: action === 'deposit' ? '~ 10 minutes' : '~ 7 days',
    gasFee: gasFee,
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
  };
};
