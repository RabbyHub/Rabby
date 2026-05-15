import type { Tx } from '@rabby-wallet/rabby-api/dist/types';
import type {
  GasSelectionOptions,
  SignerConfig,
} from '@/ui/component/MiniSignV2/domain/types';

import { useMemoizedFn } from 'ahooks';
import { useWallet } from '@/ui/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { omit } from 'lodash';
import { Account } from '@/background/service/preference';
import { normalizeTxParams } from '../views/Approval/components/SignTx';
import { registry } from '@/ui/component/MiniSignV2/registry';
import { SignatureManager } from '@/ui/component/MiniSignV2/state/SignatureManager';

export type SimpleSignConfig = {
  txs?: Tx[];
  buildTxs?: () => Promise<Tx[] | undefined>;
  gasSelection?: GasSelectionOptions;
  pauseAfter?: number;
  isHideErrorUI?: boolean;
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
  account: Account | null | undefined;
  chainServerId?: string;
  autoResetGasStoreOnChainChange?: boolean;
}) => {
  const instanceRef = useRef<SignatureManager | null>(null);
  if (!instanceRef.current) {
    instanceRef.current = new SignatureManager();
  }
  const instance = instanceRef.current;
  const {
    miniGasLevel,
    setMiniGasLevel,
    miniCustomPrice,
    updateMiniCustomPrice: setMiniCustomPrice,
    reset: resetGasStore,
  } = useLocalMiniSignGasStore();

  const previousChainServerIdRef = useRef(chainServerId);
  const signerScopeKey = `${account?.type || ''}:${account?.address || ''}:${
    chainServerId || ''
  }`;
  const previousSignerScopeKeyRef = useRef(signerScopeKey);

  useEffect(() => {
    if (previousSignerScopeKeyRef.current !== signerScopeKey) {
      previousSignerScopeKeyRef.current = signerScopeKey;
      instance.clearManualGasMethod();
    }

    if (previousChainServerIdRef.current === chainServerId) {
      return;
    }

    previousChainServerIdRef.current = chainServerId;
    if (autoResetGasStoreOnChainChange && miniGasLevel === 'custom') {
      resetGasStore();
    }
  }, [
    autoResetGasStoreOnChainChange,
    chainServerId,
    instance,
    miniGasLevel,
    resetGasStore,
    signerScopeKey,
  ]);

  const updateMiniGasStore = useCallback(
    (params: {
      gasLevel: 'normal' | 'slow' | 'fast' | 'custom';
      chainId: number;
      customGasPrice?: number;
      fixed?: boolean;
    }) => {
      setMiniGasLevel(params.gasLevel);
      setMiniCustomPrice(params.customGasPrice || 0);
    },
    [setMiniGasLevel, setMiniCustomPrice]
  );

  const wallet = useWallet();

  const assertAccount = useMemoizedFn(() => {
    const runtimeAccount = account as Account | null | undefined;
    if (!runtimeAccount) {
      throw new Error('Mini signer account is unavailable');
    }

    return runtimeAccount;
  });

  const toSignerConfig = (cfg: SimpleSignConfig): SignerConfig => ({
    account: assertAccount(),
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
      instance.close({ preserveManualGasMethod: true });
      return;
    }

    await instance.prefetch(
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
    async (
      cfg: SimpleSignConfig & { pauseAfter?: number; isHideErrorUI?: boolean }
    ): Promise<string[]> => {
      const payload = await prepareSignerPayload(cfg);
      if (!payload) {
        throw new Error('No transactions to sign');
      }

      return instance.startUI(
        {
          txs: payload.txs,
          config: payload.signerConfig,
          enableSecurityEngine: cfg.enableSecurityEngine,
          gasSelection: payload.gasSelection,
        },
        wallet,
        { pauseAfter: cfg.pauseAfter, isHideErrorUI: cfg.isHideErrorUI }
      );
    }
  );

  const openDirect = useMemoizedFn(
    async (
      cfg: SimpleSignConfig & { pauseAfter?: number; isHideErrorUI?: boolean }
    ): Promise<string[]> => {
      const payload = await prepareSignerPayload(cfg);
      if (!payload) {
        throw new Error('No transactions to sign');
      }
      return instance.openDirect(
        {
          txs: payload.txs,
          config: payload.signerConfig,
          enableSecurityEngine: false,
          gasSelection: payload.gasSelection,
        },
        wallet,
        { pauseAfter: cfg.pauseAfter, isHideErrorUI: cfg.isHideErrorUI }
      );
    }
  );

  const updateConfig = useMemoizedFn((next: Partial<SimpleSignConfig>) => {
    const partial = toPartialSignerConfig(next);
    instance.updateConfig(partial);
  });

  const close = useMemoizedFn(() => {
    instance.close();
  });

  useEffect(() => {
    registry.add(instance);
    return () => {
      registry.destroy(instance.instanceId);
    };
  }, [instance]);
  return {
    instance,
    openDirect,
    openUI,
    prefetch,
    close,
    updateConfig,
    resetGasStore,
  } as const;
};
