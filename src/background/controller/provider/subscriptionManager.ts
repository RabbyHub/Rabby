import { permissionService } from '@/background/service';
import { EthereumProvider } from '@/background/utils/buildinProvider';
import eventBus from '@/eventBus';
import { Chain } from '@/types/chain';
import { findChain } from '@/utils/chain';
import { PollingBlockTracker } from '@metamask/eth-block-tracker';
import createSubscriptionManager from '@metamask/eth-json-rpc-filters/subscriptionManager';

const createSubscription = (origin: string) => {
  const chain = findChain({
    enum: permissionService.getConnectedSite(origin)?.chain,
  });
  const provider = new EthereumProvider();
  const handleChangeChange = (params: { origin: string; chain: Chain }) => {
    if (params.origin === origin) {
      provider.chainId = params.chain.network;
    }
  };
  eventBus.addEventListener('rabby:chainChanged', handleChangeChange);
  provider.chainId = chain?.network || '1';
  const blockTracker = new PollingBlockTracker({
    provider: provider as any,
  });
  const { events, middleware } = createSubscriptionManager({
    provider,
    blockTracker,
  });
  const { destroy } = middleware;
  const func = async (req) => {
    const { data } = req || {};
    const res: Record<string, any> = {};
    let error = null;
    await middleware(
      data,
      res,
      () => null,
      (e) => {
        error = e;
      }
    );
    if (error) {
      throw error;
    }
    return res.result;
  };

  return {
    events,
    methods: {
      eth_subscribe: func,
      eth_unsubscribe: func,
    },
    destroy: () => {
      destroy();
      blockTracker.destroy();
      eventBus.removeEventListener('rabby:chainChanged', handleChangeChange);
    },
  };
};

export default createSubscription;
