// TODO: limit request count, slide window, unique number can loop
import Message from './message';

const EV_TYPE = ['SYN', 'ACK'];

export default class DomMessage extends Message {
  constructor(...args) {
    super(...args);
  }

  listen = (listenCallback) => {
    this.listenCallback = listenCallback;
    this.evType = EV_TYPE[0];
    document.addEventListener(this.evType, ({ detail }) => {
      this.emit('data', detail);
    });

    return this;
  }

  connect = () => {
    this.evType = EV_TYPE[1];
    document.addEventListener(this.evType, ({ detail }) => {
      this.emit('data', detail);
    });

    return this;
  }

  send = (detail) => {
    const evName = this.evType === EV_TYPE[0] ? EV_TYPE[1] : EV_TYPE[0];
    document.dispatchEvent(new CustomEvent(evName, { detail }));
  }
}
