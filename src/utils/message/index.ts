/**
 * this script is live in content-script / dapp's page
 */

import { EventEmitter } from 'events';
import { ethErrors } from 'eth-rpc-errors';
import PQueue from 'p-queue';

const pQueue = new PQueue({ concurrency: 1000 });

abstract class Message extends EventEmitter {
  // available id list
  // max concurrent request limit
  private _requestIdPool = [...Array(1000).keys()];
  protected _EVENT_PRE = 'ETH_WALLET_';
  protected listenCallback: any;

  private _waitingMap = new Map<
    number,
    {
      data: any;
      resolve: (arg: any) => any;
      reject: (arg: any) => any;
    }
  >();

  abstract send(type: string, data: any): void;

  request = (data) => {
    return pQueue.add(() => {
      if (!this._requestIdPool.length) {
        throw ethErrors.rpc.limitExceeded();
      }
      const ident = this._requestIdPool.shift()!;

      return new Promise((resolve, reject) => {
        this._waitingMap.set(ident, {
          data,
          resolve,
          reject,
        });

        this.send('request', { ident, data });
      });
    });
  };

  onResponse = async ({ ident, res, err }: any = {}) => {
    // the url may update
    if (!this._waitingMap.has(ident)) {
      return;
    }

    const { resolve, reject } = this._waitingMap.get(ident)!;

    this._requestIdPool.push(ident);
    this._waitingMap.delete(ident);
    err ? reject(err) : resolve(res);
  };

  onRequest = async ({ ident, data }) => {
    if (this.listenCallback) {
      let res, err;

      try {
        res = await this.listenCallback(data);
      } catch (e: any) {
        err = {
          message: e.message,
          stack: e.stack,
        };
        e.code && (err.code = e.code);
        e.data && (err.data = e.data);
      }

      this.send('response', { ident, res, err });
    }
  };

  _dispose = () => {
    for (const request of this._waitingMap.values()) {
      request.reject(ethErrors.provider.userRejectedRequest());
    }

    this._waitingMap.clear();
  };
}

export default Message;
