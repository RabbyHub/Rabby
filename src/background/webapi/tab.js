import { EventEmitter } from 'events';

chrome.tabs.onUpdated.addListener((tabid, changeInfo) => {
  if (changeInfo.url) {
    Tab.fromId(tabid).emit('updated');
  }
});

chrome.tabs.onRemoved.addListener((tabid) => {
  Tab.fromId(tabid).emit('removed');
  Tab.deleteId(tabid);
});

const tabs = new Map();

class Tab extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;

    tabs.set(id, this);
  }

  static fromId(id) {
    if (tabs.has(id)) {
      return tabs.get(id);
    }

    return new Tab(id);
  }

  static deleteId(id) {
    tabs.delete(id);
  }
}

export default Tab;
