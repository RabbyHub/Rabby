class Session {
  origin:string = ''
  
  icon: string = ''

  name: string = ''

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
  if (sessionMap.has(id)) {
    return sessionMap.get(id);
  }

  return createSession(id, null);
};

const createSession = (id, data) => {
  const session = new Session(data);
  sessionMap.set(id, session);

  return session;
};

const deleteSession = (id) => {
  sessionMap.delete(id);
};

const broadcastEvent = (ev, data?, origin?) => {
  let sessions = [...Array.from(sessionMap)];

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
