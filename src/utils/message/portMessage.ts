import Message from './index';

class PortMessage extends Message {
  port: chrome.runtime.Port | null = null;
  listenCallback: any;

  constructor(port?: chrome.runtime.Port) {
    super();

    if (port) {
      this.port = port;
    }
  }

  connect = () => {
    this.port = window.chrome.runtime.connect();
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

  listen = (listenCallback: any) => {
    if (!this.port) return;
    this.listenCallback = listenCallback;
    this.port.onMessage.addListener(({ _type_, data }) => {
      if (_type_ === `${this.EVENT_PRE}request`) {
        this.onRequest(data);
      }
    });

    return this;
  };

  send = (type, data) => {
    if (!this.port) return;
    this.port.postMessage({ _type_: `${this.EVENT_PRE}${type}`, data });
  };
}

export default PortMessage;
