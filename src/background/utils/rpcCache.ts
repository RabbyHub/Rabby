type CacheState = Map<string, { timeoutId: number; result: any }>;

class RpcCache {
  state: CacheState = new Map();

  set(
    address: string,
    data: { method: string; params: any; result: any },
    expireTime = 10000
  ) {
    const key = `${address}-${data.method}-${JSON.stringify(data.params)}`;
    const cache = this.getIfExist(key);
    if (cache) {
      const { timeoutId } = this.state.get(key)!;
      window.clearTimeout(timeoutId);
      const id = window.setTimeout(() => {
        this.state.delete(key);
      }, expireTime);
      this.state.set(key, {
        result: data.result,
        timeoutId: id,
      });
    } else {
      const methodState: CacheState = new Map();
      const timeoutId = window.setTimeout(() => {
        methodState.delete(key);
      }, expireTime);
      this.state.set(key, { result: data.result, timeoutId });
    }
  }

  has(address: string, data: { method: string; params: any }) {
    const key = `${address}-${data.method}-${JSON.stringify(data.params)}`;
    const timeout = this.getIfExist(key);
    if (timeout !== null) {
      return true;
    }

    return false;
  }

  get(address: string, data: { method: string; params: any }) {
    const key = `${address}-${data.method}-${JSON.stringify(data.params)}`;
    const cache = this.getIfExist(key);
    if (cache) {
      this.updateExpire(address, data);
    }
    return cache?.result;
  }

  updateExpire(
    address: string,
    data: { method: string; params: any },
    expireTime = 10000
  ) {
    const key = `${address}-${data.method}-${JSON.stringify(data.params)}`;
    const cache = this.getIfExist(key);
    if (cache) {
      const timeoutId = window.setTimeout(() => {
        this.state.delete(key);
      }, expireTime);
      this.state.set(key, {
        timeoutId,
        result: cache.result,
      });
    }
  }

  private getIfExist(key: string) {
    if (this.state.has(key)) return this.state.get(key);
    return null;
  }
}

export default new RpcCache();
