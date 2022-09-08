import { PollingBlockTracker } from 'eth-block-tracker';

import createSubscriptionManager from 'eth-json-rpc-filters/subscriptionManager';

const createSubscription = (provider) => {
  const blockTracker = new PollingBlockTracker({
    provider,
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
    destroy,
  };
};

export default createSubscription;
