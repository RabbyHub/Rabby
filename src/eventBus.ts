type Listener = (params?: any) => void;

class EventBus {
  events: Record<string, Listener[]> = {};

  emit = (type: string, params?: any) => {
    const listeners = this.events[type];
    if (listeners) {
      listeners.forEach((fn) => {
        fn(params);
      });
    }
  };

  addEventListener = (type: string, fn: Listener) => {
    const listeners = this.events[type];
    if (listeners) {
      this.events[type].push(fn);
    } else {
      this.events[type] = [fn];
    }
  };

  removeEventListerner = (type: string, fn: Listener) => {
    const listeners = this.events[type];
    if (listeners) {
      this.events[type] = this.events[type].filter((item) => item !== fn);
    }
  };
}

export default new EventBus();
