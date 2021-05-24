import { tab } from 'background/webapi';
import { session } from 'background/service';

import rpcFlow from './rpcFlow';
import internalMethod from './internalMethod';

tab.on('tabRemove', (id) => {
  session.deleteSession(id);
});

export default (req) => {
  const {
    data: { method },
  } = req;

  if (internalMethod[method]) {
    return Promise.resolve(internalMethod[method](req));
  }

  return rpcFlow(req);
};
