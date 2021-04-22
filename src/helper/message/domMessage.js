// TODO: limit request count, slide window, unique number can loop
import Message from '.';

const EV_PRE = 'ETH_WALLET_';

function listenEvent(type) {
  document.addEventListener(`${EV_PRE}${type}`, ({ detail }) => {
    this.emit(type, detail);
  });
}

export default class DomMessage extends Message {
  constructor(...args) {
    super(...args);
    this.name ='dm'
  }

  connect = () => {
    listenEvent.call(this, 'response');
    listenEvent.call(this, 'message');

    return this;
  };

  listen = (listenCallback) => {
    this.listenCallback = listenCallback;
    listenEvent.call(this, 'request');

    return this;
  };

  send = (type, detail) => {
    document.dispatchEvent(new CustomEvent(`${EV_PRE}${type}`, { detail }));
  };
}
