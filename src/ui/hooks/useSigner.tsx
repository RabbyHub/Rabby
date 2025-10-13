import type { Tx } from '@rabby-wallet/rabby-api/dist/types';
import type {
  GasSelectionOptions,
  SignerConfig,
} from '@/ui/component/MiniSignV2/domain/types';

import { useMemoizedFn } from 'ahooks';
import { useWallet } from '@/ui/utils';
import { signatureStore } from '@/ui/component/MiniSignV2/state';
import { useCallback, useEffect, useState } from 'react';
import { omit } from 'lodash';
import { Account } from '@/background/service/preference';
import { normalizeTxParams } from '../views/Approval/components/SignTx';

export type SimpleSignConfig = {
  txs?: Tx[];
  buildTxs?: () => Promise<Tx[] | undefined>;
  gasSelection?: GasSelectionOptions;
} & Omit<SignerConfig, 'account'>;

const useLocalMiniSignGasStore = () => {
  const [miniGasLevel, setMiniGasLevel] = useState<
    'normal' | 'slow' | 'fast' | 'custom'
  >('normal');
  const [miniCustomPrice, setMiniCustomPrice] = useState(0);

  const reset = useCallback(() => {
    setMiniGasLevel('normal');
    setMiniCustomPrice(0);
  }, [setMiniGasLevel, setMiniCustomPrice]);

  return {
    miniGasLevel,
    setMiniGasLevel,
    miniCustomPrice,
    setMiniCustomPrice,
    updateMiniCustomPrice: setMiniCustomPrice,
    reset,
  };
};

export const useMiniSigner = ({
  account,
  chainServerId,
  resetGasStore,
}: {
  account: Account;
  chainServerId?: string;
  resetGasStore?: boolean;
}) => {
  const {
    miniGasLevel,
    setMiniGasLevel,
    miniCustomPrice,
    updateMiniCustomPrice: setMiniCustomPrice,
    reset,
  } = useLocalMiniSignGasStore();

  console.log('miniGasLevel', {
    miniGasLevel,
    miniCustomPrice,
  });

  useEffect(() => {
    reset();
    return reset;
  }, []);

  const [previousChainServerId, setPreviousChainServerId] = useState(
    chainServerId
  );

  if (previousChainServerId !== chainServerId && resetGasStore) {
    setPreviousChainServerId(chainServerId);
    if (miniGasLevel === 'custom') {
      reset();
    }
  }

  const updateMiniGasStore = useCallback(
    (params: {
      gasLevel: 'normal' | 'slow' | 'fast' | 'custom';
      chainId: number;
      customGasPrice?: number;
      fixed?: boolean;
    }) => {
      console.log('updateMiniGasStore', params);
      setMiniGasLevel(params.gasLevel);
      setMiniCustomPrice(params.customGasPrice || 0);
    },
    [setMiniGasLevel, setMiniCustomPrice]
  );

  const wallet = useWallet();

  const toSignerConfig = (cfg: SimpleSignConfig): SignerConfig => ({
    account,
    updateMiniGasStore,
    ...cfg,
  });

  const toPartialSignerConfig = (
    cfg: Partial<SimpleSignConfig>
  ): Partial<SignerConfig> => {
    const partial: Partial<SignerConfig> = {
      ...omit(cfg, ['txs', 'buildTxs', 'gasSelection']),
    };
    return partial;
  };

  useEffect(() => {
    signatureStore.close();
    return () => signatureStore.close();
  }, []);

  const ensureTxs = useMemoizedFn(async (cfg: SimpleSignConfig) => {
    let txs: Tx[] | undefined = cfg.txs;
    if (!txs && cfg.buildTxs) txs = (await cfg.buildTxs()) || [];
    return txs || [];
  });

  const prefetch = useMemoizedFn(async (cfg: SimpleSignConfig) => {
    const txs = await ensureTxs(cfg);
    if (!txs.length) {
      signatureStore.close();
      return;
    }

    const { isSwap, isBridge, isSend, isSpeedUp, isCancel } = normalizeTxParams(
      txs[0]
    );

    const signerCfg = toSignerConfig(cfg);
    await signatureStore.prefetch(
      {
        txs,
        config: signerCfg,
        enableSecurityEngine: cfg.enableSecurityEngine,
        gasSelection: cfg.gasSelection || {
          flags: {
            isSwap,
            isBridge,
            isSend,
            isSpeedUp,
            isCancel,
          },
          lastSelection: {
            lastTimeSelect: miniGasLevel === 'custom' ? 'gasPrice' : 'gasLevel',
            gasLevel: miniGasLevel,
            gasPrice: miniCustomPrice,
          },
        },
      },
      wallet
    );
  });

  const openUI = useMemoizedFn(
    async (cfg: SimpleSignConfig): Promise<string[]> => {
      const txs = await ensureTxs(cfg);
      if (!txs.length) {
        throw new Error('No transactions to sign');
      }
      const signerCfg = toSignerConfig(cfg);
      const {
        isSwap,
        isBridge,
        isSend,
        isSpeedUp,
        isCancel,
      } = normalizeTxParams(txs[0]);

      return signatureStore.startUI(
        {
          txs,
          config: signerCfg,
          enableSecurityEngine: cfg.enableSecurityEngine,
          gasSelection: cfg.gasSelection || {
            flags: {
              isSwap,
              isBridge,
              isSend,
              isSpeedUp,
              isCancel,
            },
            lastSelection: {
              lastTimeSelect:
                miniGasLevel === 'custom' ? 'gasPrice' : 'gasLevel',
              gasLevel: miniGasLevel,
              gasPrice: miniCustomPrice,
            },
          },
        },
        wallet
      );
    }
  );

  const openDirect = useMemoizedFn(
    async (cfg: SimpleSignConfig): Promise<string[]> => {
      const txs = await ensureTxs(cfg);
      if (!txs.length) {
        throw new Error('No transactions to sign');
      }
      const {
        isSwap,
        isBridge,
        isSend,
        isSpeedUp,
        isCancel,
      } = normalizeTxParams(txs[0]);
      const signerCfg = toSignerConfig(cfg);
      return signatureStore.openDirect(
        {
          txs,
          config: signerCfg,
          enableSecurityEngine: false,
          gasSelection: cfg.gasSelection || {
            flags: {
              isSwap,
              isBridge,
              isSend,
              isSpeedUp,
              isCancel,
            },
            lastSelection: {
              lastTimeSelect:
                miniGasLevel === 'custom' ? 'gasPrice' : 'gasLevel',
              gasLevel: miniGasLevel,
              gasPrice: miniCustomPrice,
            },
          },
        },
        wallet
      );
    }
  );

  const updateConfig = useMemoizedFn((next: Partial<SimpleSignConfig>) => {
    const partial = toPartialSignerConfig(next);
    signatureStore.updateConfig(partial);
  });

  const close = useMemoizedFn(() => signatureStore.close());
  return {
    openDirect,
    openUI,
    prefetch,
    close,
    updateConfig,
    resetGasStore: reset,
  } as const;
};
