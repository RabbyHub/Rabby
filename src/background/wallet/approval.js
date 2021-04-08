import { openPopup } from 'background/webapi';

// something need user approval in popup
class Approval {
  store = new Map();

  getApproval = (id = '0') => {
    // for now, just one
    const [key] = this.store.keys();

    return key && this.store.get(key);
  };

  handleApproval = (id = '0', { err, res }) => {
    if (!this.store.has(id)) {
      throw new Error('approval had been handled');
    }

    const { resolve, reject } = this.store.get(id);

    err ? reject(err) : resolve(res);
  }

  setApprovalWithPopup = (id = '0', data) => {
    // for now, just one

    return new Promise((resolve, reject) => {
      this.store.set(id, {
        ...data,
        resolve: (data) => {
          resolve(data);
          this.removeApproval(id);
        },
        reject: (err) => {
          reject(err);
          this.removeApproval(id);
        },
      });

      openPopup();
    });
  }

  removeApproval = (id = '0') => {
    this.store.delete(id);
  }
}

export default new Approval();
