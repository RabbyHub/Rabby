import { tab } from 'background/webapi';
import { sessionService } from 'background/service';

import rpcFlow from './rpcFlow';
import internalMethod from './internalMethod';

tab.on('tabRemove', (id) => {
  sessionService.deleteSession(id);
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
