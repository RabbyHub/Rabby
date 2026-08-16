import browser, { Runtime } from 'webextension-polyfill';
import Message, { MessageDisconnectedError } from './index';
class PortMessage extends Message {
  port: Runtime.Port | null = null;
  listenCallback: any;

  constructor(port?: Runtime.Port) {
    super();

    if (port) {
      this.port = port;
    }
  }

  connect = (name?: string) => {
    if (this.port) return this;

    const port = browser.runtime.connect(
      undefined,
      name ? { name } : undefined
    );
    this.port = port;
    port.onMessage.addListener(({ _type_, data }) => {
      if (_type_ === `${this._EVENT_PRE}message`) {
        this.emit('message', data);
        return;
      }

      if (_type_ === `${this._EVENT_PRE}response`) {
        this.onResponse(data);
      }
    });
    port.onDisconnect.addListener(() => {
      if (this.port !== port) return;

      this.port = null;
      this.rejectPendingRequests(new MessageDisconnectedError());
      this.emit('disconnect');
    });

    return this;
  };

  listen = (listenCallback: any) => {
    if (!this.port) return;
    this.listenCallback = listenCallback;
    this.port.onMessage.addListener(({ _type_, data }) => {
      if (_type_ === `${this._EVENT_PRE}request`) {
        this.onRequest(data);
      }
    });

    return this;
  };

  send = (type, data) => {
    if (!this.port) return false;
    try {
      this.port.postMessage({ _type_: `${this._EVENT_PRE}${type}`, data });
      return true;
    } catch {
      return false;
    }
  };

  dispose = () => {
    const port = this.port;
    this.port = null;
    this._dispose();
    port?.disconnect();
    this.removeAllListeners();
  };
}

export default PortMessage;
