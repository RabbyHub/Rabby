import { Runtime, browser } from 'webextension-polyfill-ts';
import Message from './index';
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
    this.port = browser.runtime.connect(undefined, name ? { name } : undefined);
    this.port.onMessage.addListener(({ _type_, data }) => {
      if (_type_ === `${this._EVENT_PRE}message`) {
        this.emit('message', data);
        return;
      }

      if (_type_ === `${this._EVENT_PRE}response`) {
        this.onResponse(data);
      }
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
    if (!this.port) return;
    this.port.postMessage({ _type_: `${this._EVENT_PRE}${type}`, data });
  };

  dispose = () => {
    this._dispose();
    this.port?.disconnect();
  };
}

export default PortMessage;
