import Message from './index';

export default class DomMessage extends Message {
  listenEvent = (type, callback) => {
    document.addEventListener(`${this.EVENT_PRE}${type}`, ({ detail }) => {
      callback(detail);
    });
  };

  connect = () => {
    this.listenEvent('response', (data) => this.onResponse(data));

    this.listenEvent('message', (data) => this.emit('message', data));

    return this;
  };

  listen = (listenCallback) => {
    this.listenCallback = listenCallback;
    this.listenEvent('request', (data) => this.onRequest(data));

    return this;
  };

  send = (type, detail) => {
    document.dispatchEvent(
      new CustomEvent(`${this.EVENT_PRE}${type}`, { detail })
    );
  };
}
