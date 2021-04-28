import { tab } from 'background/webapi';
import { session } from 'background/service';

import rpcFlow from './rpcFlow';
import internal from './internal';

tab.on('tabRemove', (id) => {
  session.deleteSession(id);
});

export default (req) => {
  const {
    data: { method },
  } = req;

  if (internal[method]) {
    return Promise.resolve(internal[method](req));
  }

  return new rpcFlow().handle(req);
};
