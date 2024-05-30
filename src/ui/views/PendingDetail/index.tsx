import React, { useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { PrePackInfo } from './components/PrePackInfo';

import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { useWallet } from '@/ui/utils';
import { findChainByID, findChainByServerID } from '@/utils/chain';
import { checkIsPendingTxGroup, findMaxGasTx } from '@/utils/tx';
import { useMemoizedFn, useRequest, useSetState, useTitle } from 'ahooks';
import { message } from 'antd';
import qs from 'qs';
import { useLocation } from 'react-router-dom';
import { MempoolList } from './components/MempoolList';
import { PendingTxList } from './components/PendingTxList';
import './style.less';

const useSetup = ({
  address,
  chainId,
  nonce,
}: {
  address?: string;
  chainId?: number;
  nonce?: number;
}) => {
  const wallet = useWallet();
  const [loading, setLoading] = useSetState({
    txRequest: true,
    mempoolList: true,
    pendingTxList: true,
    latestExplain: true,
  });

  const { data: txGroup, runAsync: runGetTxGroup } = useRequest(
    async () => {
      if (address && chainId && nonce) {
        return wallet.getTxGroup({
          address,
          chainId,
          nonce,
        });
      }
    },
    {
      refreshDeps: [address, chainId, nonce],
      pollingInterval: 1000 * 6,
    }
  );

  const isPending = useMemo(
    () => (txGroup ? checkIsPendingTxGroup(txGroup) : true),
    [txGroup]
  );

  const maxGasTx = useMemo(() => {
    return findMaxGasTx(txGroup?.txs || []);
  }, [txGroup]);

  const reqId = useMemo(() => {
    return findMaxGasTx(txGroup?.txs || [])?.reqId;
  }, [txGroup]);

  const {
    data: txRequest,
    cancel: cancelGetTxRequest,
    runAsync: runGetTxrequest,
  } = useRequest(
    async () => {
      if (reqId && isPending) {
        setLoading({ txRequest: !txRequest });
        return wallet.openapi.getTxRequest(reqId);
      }
    },
    {
      refreshDeps: [reqId, isPending],
      onFinally: () => {
        setLoading({ txRequest: false });
      },
      pollingInterval: 1000 * 6,
    }
  );

  const { data: mempoolList } = useRequest(
    async () => {
      if (txRequest?.tx_id && txRequest?.push_type !== 'mev' && isPending) {
        setLoading({ mempoolList: !mempoolList });
        return wallet.openapi.mempoolChecks(
          txRequest?.tx_id,
          txRequest?.chain_id,
          true
        );
      }
    },
    {
      refreshDeps: [txRequest?.tx_id, txRequest?.chain_id, isPending],
      pollingInterval: 1000 * 6,
      onFinally: () => {
        setLoading({ mempoolList: false });
      },
    }
  );
  const { data: latestExplain } = useRequest(
    async () => {
      if (reqId && isPending) {
        setLoading({ latestExplain: !latestExplain });
        return wallet.openapi.getLatestPreExec({ id: reqId });
      }
    },
    {
      refreshDeps: [reqId, isPending],
      onFinally: () => {
        setLoading({ latestExplain: false });
      },
      pollingInterval: 1000 * 6,
    }
  );

  const { data: pendingTxList } = useRequest(
    async () => {
      if (txRequest?.chain_id && txRequest?.push_type !== 'mev' && isPending) {
        setLoading({ pendingTxList: !pendingTxList });
        return wallet.openapi.getPendingTxList({
          chain_id: txRequest?.chain_id,
        });
      }
    },
    {
      refreshDeps: [txRequest?.chain_id, txRequest?.push_type, isPending],
      onFinally: () => {
        setLoading({ pendingTxList: false });
      },
      pollingInterval: 1000 * 6,
    }
  );

  const { data: baseFee } = useRequest(
    async () => {
      if (txRequest?.chain_id && isPending) {
        return wallet.requestETHRpc<any>(
          {
            method: 'eth_baseFee',
            params: [],
          },
          txRequest?.chain_id
        );
      }
    },
    {
      refreshDeps: [txRequest?.chain_id, isPending],
      pollingInterval: 1000 * 6,
    }
  );

  const handleReload = useMemoizedFn(() => {
    runGetTxGroup();
    if (!isPending) {
      cancelGetTxRequest();
    }
  });

  useEffect(() => {
    eventBus.addEventListener(EVENTS.RELOAD_TX, handleReload);
    return () => {
      eventBus.removeEventListener(EVENTS.RELOAD_TX, handleReload);
    };
  }, [handleReload]);

  return {
    loading,
    txRequest,
    mempoolList,
    latestExplain,
    txGroup,
    pendingTxList,
    baseFee,
    isPending,
    maxGasTx,
    runGetTxrequest,
  };
};

export const PendingDetail = () => {
  const wallet = useWallet();
  const location = useLocation();
  const { address, chainId, nonce } = useMemo(() => {
    const res = qs.parse(location.search, { ignoreQueryPrefix: true }) as {
      address?: string;
      nonce?: string;
      chainId?: string;
    };
    return {
      address: res.address,
      chainId: res?.chainId ? +res.chainId : undefined,
      nonce: res?.nonce ? +res.nonce : undefined,
    };
  }, [location.search]);

  const {
    loading,
    txRequest,
    mempoolList,
    latestExplain,
    txGroup,
    pendingTxList,
    baseFee,
    isPending,
    maxGasTx,
    runGetTxrequest,
  } = useSetup({
    address,
    chainId,
    nonce,
  });

  const title = useMemo(() => {
    const chain = chainId ? findChainByID(chainId) : null;
    return `${isPending ? 'Pending · ' : 'Completed · '} ${
      chain?.name || ''
    } #${nonce}`;
  }, [isPending, chainId, nonce]);

  useTitle(title);

  const handleReBroadcast = async () => {
    message.success('Broadcasted');
    if (txRequest?.id) {
      await wallet.retryPushTx({
        address: txRequest?.user_addr,
        reqId: txRequest?.id,
        chainId: findChainByServerID(txRequest?.chain_id)!.id,
        nonce: txRequest?.nonce,
      });
      runGetTxrequest();
    }
  };

  return (
    <div className="page-pending-detail">
      <Header
        data={txRequest}
        tx={txGroup}
        onReBroadcast={handleReBroadcast}
        isPending={isPending}
        loading={loading.txRequest}
      >
        <PrePackInfo
          explain={maxGasTx?.explain || txGroup?.explain}
          latestExplain={latestExplain}
          loading={loading.txRequest || loading.latestExplain}
          isPending={isPending}
        />
      </Header>
      <div className="layout-container mt-[24px] main-content">
        <div className="relative z-1">
          <MempoolList
            list={mempoolList}
            txRequest={txRequest}
            loading={loading.txRequest || loading.mempoolList}
          />
          <PendingTxList
            txRequest={txRequest}
            tx={txGroup || undefined}
            data={pendingTxList}
            baseFee={baseFee}
            loading={loading.txRequest || loading.pendingTxList}
          />
        </div>
      </div>
    </div>
  );
};
