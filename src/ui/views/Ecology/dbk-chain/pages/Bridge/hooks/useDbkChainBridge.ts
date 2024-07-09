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
  publicActionsL1,
  publicActionsL2,
  walletActionsL1,
  walletActionsL2,
} from 'viem/op-stack';

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
}: {
  action: 'deposit' | 'withdraw';
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

  const createViemClient = useMemoizedFn(
    ({
      chainId,
      viemChain,
    }: {
      chainId: number;
      viemChain: NonNullable<Parameters<typeof createWalletClient>[0]['chain']>;
    }) => {
      const chain = findChain({
        id: chainId,
      })!;
      console.log(chain);
      return createWalletClient({
        chain: viemChain,
        transport: custom({
          async request({ method, params }) {
            console.log(method, params, chainId);
            if (
              method === 'eth_sendTransaction' &&
              params[0] &&
              !('chainId' in params[0])
            ) {
              params[0].chainId = chainId;
            }
            if (method === 'eth_sendTransaction') {
              return wallet.sendRequest<any>({
                method,
                params,
              });
            } else {
              return wallet.requestETHRpc<any>(
                {
                  method,
                  params,
                },
                chain.serverId
              );
            }
          },
        }),
      });
    }
  );

  const createL1Client = useMemoizedFn(({ chainId }: { chainId: number }) => {
    return createViemClient({ chainId, viemChain: mainnet })
      .extend(walletActionsL1())
      .extend(publicActionsL1())
      .extend(publicActions);
  });

  const createL2Client = useMemoizedFn(({ chainId }: { chainId: number }) => {
    return createViemClient({ chainId, viemChain: dbk })
      .extend(walletActionsL2())
      .extend(publicActionsL2())
      .extend(publicActions);
  });

  const clientL1 = useMemo(() => createL1Client({ chainId: 1 }), []);

  const clientL2 = useMemo(() => createL2Client({ chainId: DBK_CHAIN_ID }), []);

  const [payAmount, setPayAmount] = useState('');
  const account = useCurrentAccount();

  const handleDeposit = useMemoizedFn(async () => {
    try {
      const args = await clientL2.buildDepositTransaction({
        account: (account!.address as unknown) as `0x${string}`,
        mint: parseEther(payAmount),
        to: (account!.address as unknown) as `0x${string}`,
      });

      const hash = await clientL1.depositTransaction(args);

      console.log(hash);

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
    const args = await clientL1.buildInitiateWithdrawal({
      account: account!.address as any,
      to: account!.address as any,
      value: parseEther(payAmount),
    });
    const hash = await clientL2.initiateWithdrawal(args);
    console.log(hash);
  });

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
  };
};
