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
  autoResetGasStoreOnChainChange,
}: {
  account: Account;
  chainServerId?: string;
  autoResetGasStoreOnChainChange?: boolean;
}) => {
  const {
    miniGasLevel,
    setMiniGasLevel,
    miniCustomPrice,
    updateMiniCustomPrice: setMiniCustomPrice,
    reset: resetGasStore,
  } = useLocalMiniSignGasStore();

  useEffect(() => {
    resetGasStore();
    return resetGasStore;
  }, []);

  const [previousChainServerId, setPreviousChainServerId] = useState(
    chainServerId
  );

  if (
    previousChainServerId !== chainServerId &&
    autoResetGasStoreOnChainChange
  ) {
    setPreviousChainServerId(chainServerId);
    if (miniGasLevel === 'custom') {
      resetGasStore();
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

  const buildGasSelection = useMemoizedFn(
    (tx: Tx, incoming?: GasSelectionOptions): GasSelectionOptions => {
      if (incoming) return incoming;

      const {
        isSwap,
        isBridge,
        isSend,
        isSpeedUp,
        isCancel,
      } = normalizeTxParams(tx);

      return {
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
      };
    }
  );

  const prepareSignerPayload = useMemoizedFn(
    async (
      cfg: SimpleSignConfig
    ): Promise<{
      txs: Tx[];
      signerConfig: SignerConfig;
      gasSelection: GasSelectionOptions;
    } | null> => {
      const txs = await ensureTxs(cfg);
      if (!txs.length) return null;
      const signerConfig = toSignerConfig(cfg);
      return {
        txs,
        signerConfig,
        gasSelection: buildGasSelection(txs[0], cfg.gasSelection),
      };
    }
  );

  const prefetch = useMemoizedFn(async (cfg: SimpleSignConfig) => {
    const payload = await prepareSignerPayload(cfg);
    if (!payload) {
      signatureStore.close();
      return;
    }

    await signatureStore.prefetch(
      {
        txs: payload.txs,
        config: payload.signerConfig,
        enableSecurityEngine: cfg.enableSecurityEngine,
        gasSelection: payload.gasSelection,
      },
      wallet
    );
  });

  const openUI = useMemoizedFn(
    async (cfg: SimpleSignConfig): Promise<string[]> => {
      const payload = await prepareSignerPayload(cfg);
      if (!payload) {
        throw new Error('No transactions to sign');
      }

      console.log('cfgcfg', cfg, payload);

      return signatureStore.startUI(
        {
          txs: payload.txs,
          config: payload.signerConfig,
          enableSecurityEngine: cfg.enableSecurityEngine,
          gasSelection: payload.gasSelection,
        },
        wallet
      );
    }
  );

  const openDirect = useMemoizedFn(
    async (cfg: SimpleSignConfig): Promise<string[]> => {
      const payload = await prepareSignerPayload(cfg);
      if (!payload) {
        throw new Error('No transactions to sign');
      }
      return signatureStore.openDirect(
        {
          txs: payload.txs,
          config: payload.signerConfig,
          enableSecurityEngine: false,
          gasSelection: payload.gasSelection,
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
    resetGasStore,
  } as const;
};
