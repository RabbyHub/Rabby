import Message from './message';

class PortMessage extends Message {
  constructor(port, ...args) {
    super(...args);
    if (port) {
      this.port = port;
    }
  }

  connect = () => {
    this.port = chrome.runtime.connect();
    this.port.onMessage.addListener((data) => {
      this.emit('data', data);
    });

    return this;
  }

  listen = (listenCallback) => {
    this.listenCallback = listenCallback;
    this.port.onMessage.addListener((data) => {
      this.emit('data', data);
    });

    return this;
  }

  send = (data) => {
    this.port.postMessage(data);
  }
}

export default PortMessage;
