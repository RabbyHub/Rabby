import { WindowPostMessageStream } from '@metamask/post-message-stream';
import Message from './index';

export default class BroadcastChannelMessage extends Message {
  private _channel: WindowPostMessageStream;

  constructor({ name, target }: { name: string; target: string }) {
    super();
    if (!name || !target) {
      throw new Error('the broadcastChannel name or target is missing');
    }

    this._channel = new WindowPostMessageStream({
      name,
      target,
    });
  }

  connect = () => {
    this._channel.on('data', (res) => {
      if (!res.data) {
        return;
      }
      const {
        data: { type, data },
      } = res;
      if (type === 'message') {
        this.emit('message', data);
      } else if (type === 'response') {
        this.onResponse(data);
      }
    });

    return this;
  };

  listen = (listenCallback) => {
    this.listenCallback = listenCallback;

    this._channel.on('data', (res) => {
      if (!res.data) {
        return;
      }
      const {
        data: { type, data },
      } = res;
      if (type === 'request') {
        this.onRequest(data);
      }
    });

    return this;
  };

  send = (type, data) => {
    this._channel.write({
      data: {
        type,
        data,
      },
    });
  };

  dispose = () => {
    this._dispose();
    this._channel.destroy();
  };
}
