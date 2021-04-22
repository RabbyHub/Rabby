import { EventEmitter } from 'events';

class Message extends EventEmitter {
  pendingRequest = null;

  constructor() {
    super();

    this.on('response', async ({ res, err }) => {
      // the url may update
      if (!this.pendingRequest) {
        return;
      }
      const { resolve, reject } = this.pendingRequest;

      this.pendingRequest = null;

      err ? reject(err) : resolve(res);
    });

    this.on('request', async (data) => {
      if (this.listenCallback) {
        let res, err;

        try {
          res = await this.listenCallback(data);
        } catch (e) {
          // console.log('method call error', e);
          err = e?.message || e;
        }

        this.send('response', { res, err });
      }
    });

    this.on('message', (data) => {
      this.emit(data);
    });
  }

  request = (data) => {
    if (this.pendingRequest) {
      throw new Error("there's a pending request, wait until it handled");
    }

    return new Promise((resolve, reject) => {
      this.pendingRequest = {
        resolve,
        reject,
      };

      this.send('request', data);
    });
  };
}

export default Message;
