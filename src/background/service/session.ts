import { permission, session } from 'background/service';

export class Session {
  origin = '';

  icon = '';

  name = '';

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

const getOrCreateSession = (id) => {
  if (sessionMap.has(id)) {
    return getSession(id);
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
  let sessions = [...sessionMap.values()].filter((session) =>
    permission.hasPerssmion(session.origin)
  );

  // same origin
  if (origin) {
    sessions = sessions.filter((session) => session.origin === origin);
  }

  sessions.forEach((session) => session.pushMessage?.(ev, data));
};

export default {
  getSession,
  getOrCreateSession,
  deleteSession,
  broadcastEvent,
};
