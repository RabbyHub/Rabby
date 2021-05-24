import { EventEmitter } from 'events';
import { ethErrors } from 'eth-rpc-errors';

abstract class Message extends EventEmitter {
  private pendingRequest: any;
  protected _EVENT_PRE = 'ETH_WALLET_';
  protected listenCallback: any;

  _waitingQueue: Array<{
    data: any;
    resolve: (arg: any) => any;
    reject: (arg: any) => any;
  }> = [];

  abstract send(type: string, data: any): void;

  request = async (data) => {
    return new Promise((resolve, reject) => {
      this._waitingQueue.push({
        data,
        resolve,
        reject,
      });

      this._request();
    });
  };

  private _request = () => {
    if (this.pendingRequest || !this._waitingQueue.length) {
      return;
    }
    this.pendingRequest = this._waitingQueue.shift();
    this.send('request', this.pendingRequest.data);
  };

  onResponse = async ({ res, err }: any = {}) => {
    // the url may update
    if (!this.pendingRequest) {
      return;
    }
    const { resolve, reject } = this.pendingRequest;

    this.pendingRequest = null;
    err ? reject(err) : resolve(res);

    this._request();
  };

  onRequest = async (data) => {
    if (this.listenCallback) {
      let res, err;

      try {
        res = await this.listenCallback(data);
      } catch (e) {
        console.error('eee', e);
        // should be eth-rpc-errors (EthereumRpcError)
        // https://github.com/MetaMask/eth-rpc-errors/blob/main/src/classes.ts#L62
        err = e.toString();
      }

      this.send('response', { res, err });
    }
  };

  _dispose = () => {
    while (this._waitingQueue.length) {
      const { reject } = this._waitingQueue.shift()!;

      reject(ethErrors.provider.userRejectedRequest());
    }
  };
}

export default Message;
