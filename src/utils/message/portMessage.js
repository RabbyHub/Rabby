import Message from './index';

class PortMessage extends Message {
  constructor(port, ...args) {
    super(...args);
    if (port) {
      this.port = port;
    }
  }

  connect = () => {
    this.port = chrome.runtime.connect();
    this.port.onMessage.addListener(({ _type_, data }) => {
      if (_type_ === `${this.EVENT_PRE}message`) {
        this.emit('message', data);
        return;
      }

      if (_type_ === `${this.EVENT_PRE}response`) {
        this.onResponse(data);
      }
    });

    return this;
  };

  listen = (listenCallback) => {
    this.listenCallback = listenCallback;
    this.port.onMessage.addListener(({ _type_, data }) => {
      if (_type_ === `${this.EVENT_PRE}request`) {
        this.onRequest(data);
      }
    });

    return this;
  };

  send = (type, data) => {
    this.port.postMessage({ _type_: `${this.EVENT_PRE}${type}`, data });
  };
}

export default PortMessage;
