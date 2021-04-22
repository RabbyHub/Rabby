import Message from '.';

class PortMessage extends Message {
  constructor(port, ...args) {
    super(...args);
    this.name = 'pm'
    if (port) {
      this.port = port;
      this.tabId = port.sender.tab.id;
    }
  }

  connect = () => {
    this.port = chrome.runtime.connect();
    this.port.onMessage.addListener(({ _type_, data }) => {
      this.emit(_type_, data);
    });

    return this;
  };

  listen = (listenCallback) => {
    this.listenCallback = listenCallback;
    this.port.onMessage.addListener(({ _type_, data }) => {
      this.emit(_type_, data);
    });

    return this;
  };

  send = (type, data) => {
    this.port.postMessage({ _type_: type, data });
  };
}

export default PortMessage;
