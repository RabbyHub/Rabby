/**
 * this script is live in content-script / dapp's page
 */

import { EventEmitter } from 'events';
import { ethErrors } from 'eth-rpc-errors';
import PQueue from 'p-queue';
import { nanoid } from 'nanoid';

const pQueue = new PQueue({ concurrency: 1000 });

const sanitizeFeePayer = (feePayer: any) => {
  if (
    feePayer === null ||
    typeof feePayer === 'undefined' ||
    typeof feePayer === 'string'
  ) {
    return feePayer;
  }

  if (typeof feePayer !== 'object') {
    return undefined;
  }

  if (typeof feePayer.address === 'string') {
    return feePayer.address;
  }

  if (
    feePayer.account &&
    typeof feePayer.account === 'object' &&
    typeof feePayer.account.address === 'string'
  ) {
    return feePayer.account.address;
  }

  return undefined;
};

const sanitizeFeePayerSignature = (feePayerSignature: any) => {
  if (
    typeof feePayerSignature === 'undefined' ||
    typeof feePayerSignature === 'string'
  ) {
    return feePayerSignature;
  }
  if (feePayerSignature === null) {
    return undefined;
  }

  if (typeof feePayerSignature !== 'object') {
    return undefined;
  }

  const out: Record<string, any> = {};
  if (
    ['string', 'number', 'bigint'].includes(typeof feePayerSignature.r) &&
    ['string', 'number', 'bigint'].includes(typeof feePayerSignature.s)
  ) {
    out.r = feePayerSignature.r;
    out.s = feePayerSignature.s;
  }
  if (
    ['string', 'number', 'bigint'].includes(typeof feePayerSignature.yParity)
  ) {
    out.yParity = feePayerSignature.yParity;
  } else if (
    ['string', 'number', 'bigint'].includes(typeof feePayerSignature.v)
  ) {
    out.v = feePayerSignature.v;
  }

  if (!('r' in out) || !('s' in out)) {
    return undefined;
  }

  return out;
};

const sanitizeProviderRequestData = (data: any) => {
  if (
    !data ||
    typeof data !== 'object' ||
    data.method !== 'eth_sendTransaction' ||
    !Array.isArray(data.params) ||
    !data.params.length ||
    !data.params[0] ||
    typeof data.params[0] !== 'object'
  ) {
    return data;
  }

  const tx = data.params[0] as Record<string, any>;
  let changed = false;
  const nextTx = { ...tx };

  if ('feePayer' in tx) {
    const normalizedFeePayer = sanitizeFeePayer(tx.feePayer);
    changed = true;
    if (typeof normalizedFeePayer === 'undefined') {
      delete nextTx.feePayer;
    } else {
      nextTx.feePayer = normalizedFeePayer;
    }
  }

  if ('feePayerSignature' in tx) {
    const normalizedFeePayerSignature = sanitizeFeePayerSignature(
      tx.feePayerSignature
    );
    changed = true;
    if (typeof normalizedFeePayerSignature === 'undefined') {
      delete nextTx.feePayerSignature;
    } else {
      nextTx.feePayerSignature = normalizedFeePayerSignature;
    }
  }

  if (!changed) {
    return data;
  }

  return {
    ...data,
    params: [nextTx, ...data.params.slice(1)],
  };
};

abstract class Message extends EventEmitter {
  // available id list
  // max concurrent request limit
  private _requestIdPool = [...Array(1000).keys()];
  protected _EVENT_PRE = 'ETH_WALLET_';
  protected listenCallback: any;

  private _waitingMap = new Map<
    string,
    {
      data: any;
      resolve: (arg: any) => any;
      reject: (arg: any) => any;
    }
  >();

  abstract send(type: string, data: any): void;

  request = (data) => {
    const sanitizedData = sanitizeProviderRequestData(data);
    return pQueue.add(() => {
      if (!this._requestIdPool.length) {
        throw ethErrors.rpc.limitExceeded();
      }
      this._requestIdPool.shift()!;
      const ident = nanoid();

      return new Promise((resolve, reject) => {
        this._waitingMap.set(ident, {
          data: sanitizedData,
          resolve,
          reject,
        });

        this.send('request', { ident, data: sanitizedData });
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
