import Message from './index';

export default class WindowMessage extends Message {
  connect = () => {
    window.addEventListener('message', ({ data: { type, data } }) => {
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

    window.addEventListener('message', ({ data: { type, data } }) => {
      if (type === 'request') {
        this.onRequest(data);
      }
    });

    return this;
  };

  send = (type, data) => {
    window.postMessage({
      type,
      data,
    });
  };

  dispose = () => {
    this._dispose();
  };
}
