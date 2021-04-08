import { EventEmitter } from 'events';

// TODO: limit request count, slide window, unique number can loop
const maxRequest = 200;

class Message extends EventEmitter {
  _pendingReqs = new Map();

  constructor() {
    super();

    // two ends both can receive data //
    this.on('data', async ({ _id_, data, _result_ }) => {
      if (_result_) {
        if (!this._pendingReqs.has(_id_)) {
          this.emit('error')

          return;
        }
        const { resolve, reject } = this._pendingReqs.get(_id_);

        this._pendingReqs.delete(_id_);
        const { res, err } = _result_;

        err ? reject(err) : resolve(res);

        return;
      }

      if (_id_ && this.listenCallback) {
        let res, err;

        try {
          res = await this.listenCallback({ _id_, ...data });
        } catch (e) {
          err = e?.message || e;
        }

        this.send({ _id_, _result_: { res, err } });
      }
    });
  }

  request = (data) => {
    const _id_ = this._pendingReqs.size + 1;
    if (_id_ >= maxRequest) {
      throw new Error('out of max requset range');
    }

    return new Promise((resolve, reject) => {
      this._pendingReqs.set(_id_, {
        resolve,
        reject,
      });

      this.send({ _id_, data });
    });
  }
}

export default Message;
