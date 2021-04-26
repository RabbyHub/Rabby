class Session {
  constructor(data) {
    if (data) {
      this.setProp(data);
    }
  }

  setProp({ origin, icon, name }) {
    this.origin = origin;
    this.icon = icon;
    this.name = name;
  }
}

// for each tab
const sessionMap = new Map();

const getSession = (id) => {
  return sessionMap.get(id);
};

const createSession = (id, data) => {
  const session = new Session(data);
  sessionMap.set(id, session);

  return session;
};

const deleteSession = (id) => {
  sessionMap.delete(id);
};

const broadcastEvent = (ev, data, origin) => {
  let sessions = [...sessionMap];

  // same origin
  if (origin) {
    sessions = sessions.filter(([, session]) => session.origin === origin);
  }

  sessions.forEach(([, session]) => session.pushMessage(ev, data));
};

export default {
  createSession,
  getSession,
  deleteSession,
  broadcastEvent,
};
