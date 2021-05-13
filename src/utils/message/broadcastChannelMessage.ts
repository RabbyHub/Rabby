import Message from './index';

export default class BroadcastChannelMessage extends Message {
  bcm: BroadcastChannel;

  constructor(name?: string) {
    super();
    if (!name) {
      throw new Error('the broadcastChannel name is missing');
    }

    this.bcm = new BroadcastChannel(name);
  }

  connect = () => {
    this.bcm.onmessage = ({ data: { type, data } }) => {
      if (type === 'message') {
        this.emit('message', data);
      } else if (type === 'response') {
        this.onResponse(data);
      }
    };

    return this;
  };

  listen = (listenCallback) => {
    this.listenCallback = listenCallback;

    this.bcm.onmessage = ({ data: { type, data } }) => {
      if (type === 'response') {
        this.onRequest(data);
      }
    };

    return this;
  };

  send = (type, data) => {
    this.bcm.postMessage({
      type,
      data,
    });
  };

  dispose = () => {
    this.bcm.close();
  };
}
