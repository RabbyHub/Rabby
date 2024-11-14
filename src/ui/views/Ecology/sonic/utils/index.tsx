import { useWallet } from '@/ui/utils';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import { findChain } from '@/utils/chain';
import { message } from 'antd';
import { t } from 'i18next';
import React, { useCallback, useState } from 'react';
import IconSuccess from 'ui/assets/success.svg';
import { createWalletClient, custom, defineChain, publicActions } from 'viem';
import { chainConfig } from 'viem/op-stack';

export const sonicTestnet = defineChain({
  ...chainConfig,
  id: 64165,
  name: 'Sonic Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'S',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.soniclabs.com/'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'scan.soniclabs.com' },
  },
  sourceId: 1,
});

export const createViemClient = ({
  chainId,
  viemChain,
  wallet,
}: {
  chainId: number;
  viemChain: NonNullable<Parameters<typeof createWalletClient>[0]['chain']>;
  wallet: ReturnType<typeof useWallet>;
}) => {
  const chain = findChain({
    id: chainId,
  })!;
  return createWalletClient({
    chain: viemChain,
    transport: custom({
      async request({ method, params }) {
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
};

export const useCopyReferralCode = () => {
  const [hasCopied, setHasCopied] = useState(false);

  const handleCopy = useCallback((referralCode: string) => {
    setHasCopied(true);
    copyTextToClipboard(referralCode).then(() => {
      setHasCopied(false);
    });
  }, []);

  return { hasCopied, handleCopy };
};

export const copyReferralCode = async (referralCode: string) => {
  await copyTextToClipboard(referralCode);
  const duration = 3;
  const destroy = message.success({
    duration,
    icon: <i />,
    content: (
      <div>
        <div className="flex gap-4 mb-4">
          <img src={IconSuccess} alt="" />
          {t('global.copied')}
        </div>
        <div className="text-white">{referralCode}</div>
      </div>
    ),
  });
  setTimeout(() => {
    destroy();
  }, duration * 1000);
};
