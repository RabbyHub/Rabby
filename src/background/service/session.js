class Session {
  constructor(data) {
    if (data) {
      this.setProp(data);
    }
  }

  setProp(prop) {
    const { origin, icon, name } = prop;

    this.origin = origin;
    this.icon = icon;
    this.name = name;
  }
}

// for each tab
const sessionMap = new Map();

const getSession = (tabId, data) => {
  if (sessionMap.has(tabId)) {
    return sessionMap.get(tabId);
  }

  const session = new Session(tabId, data);
  sessionMap.set(tabId, session);
  return session;
};

const deleteSession = (tabId) => {
  sessionMap.delete(tabId);
};

const broadcastEvent = (ev, data, origin) => {
  let sessions = [...sessionMap];

  // same origin
  if (origin) {
    sessions = sessions.filter(([, value]) => value.origin === origin);
  }

  sessions.forEach(([, s]) => s.pushMessage(ev, data));
};

export default {
  getSession,
  deleteSession,
  broadcastEvent,
};
