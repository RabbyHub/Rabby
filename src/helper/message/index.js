import { EventEmitter } from 'events';
import { ethErrors } from 'eth-rpc-errors';

class Message extends EventEmitter {
  pendingRequest = null;
  EVENT_PRE = 'ETH_WALLET_';

  request = async (data) => {
    if (this.pendingRequest) {
      throw ethErrors.rpc.limitExceeded({
        message: "there's a pending request, wait until it handled",
        data: this.pendingRequest.data?.data,
      });
    }

    return new Promise((resolve, reject) => {
      this.pendingRequest = {
        data,
        resolve,
        reject,
      };

      this.send('request', data);
    });
  };

  onResponse = async ({ res, err } = {}) => {
    // the url may update
    if (!this.pendingRequest) {
      return;
    }
    const { resolve, reject } = this.pendingRequest;

    this.pendingRequest = null;
    err ? reject(err) : resolve(res);
  };

  onRequest = async (data) => {
    if (this.listenCallback) {
      let res, err;

      try {
        res = await this.listenCallback(data);
      } catch (e) {
        // should be eth-rpc-errors (EthereumRpcError)
        // https://github.com/MetaMask/eth-rpc-errors/blob/main/src/classes.ts#L62
        err = e.toString();
      }

      this.send('response', { res, err });
    }
  };
}

export default Message;
