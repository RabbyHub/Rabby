import { permissionService } from 'background/service';

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
  let sessions: any[] = [];
  sessionMap.forEach((session, key) => {
    if (permissionService.hasPermission(session.origin)) {
      sessions.push({
        key,
        ...session,
      });
    }
  });

  // same origin
  if (origin) {
    sessions = sessions.filter((session) => session.origin === origin);
  }

  sessions.forEach((session) => {
    try {
      session.pushMessage?.(ev, data);
    } catch (e) {
      if (sessionMap.has(session.key)) {
        deleteSession(session.key);
      }
    }
  });
};

export default {
  getSession,
  getOrCreateSession,
  deleteSession,
  broadcastEvent,
};
