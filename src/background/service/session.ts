import { permissionService } from 'background/service';
import { Object } from 'ts-toolbelt';

export interface SessionProp {
  origin: string;
  icon: string;
  name: string;
}

export class Session {
  origin = '';

  icon = '';

  name = '';

  constructor(data?: SessionProp | null) {
    if (data) {
      this.setProp(data);
    }
  }

  setProp({ origin, icon, name }: SessionProp) {
    this.origin = origin;
    this.icon = icon;
    this.name = name;
  }
}

// for each tab
const sessionMap = new Map<number, SessionProp | null>();

const getSession = (id: number) => {
  return sessionMap.get(id);
};

const getOrCreateSession = (id: number) => {
  if (sessionMap.has(id)) {
    return getSession(id);
  }

  return createSession(id, null);
};

const createSession = (id: number, data?: null | SessionProp) => {
  const session = new Session(data);
  sessionMap.set(id, session);
  console.log(session);
  return session;
};

const deleteSession = (id) => {
  sessionMap.delete(id);
};

const broadcastEvent = (ev, data?, origin?: string) => {
  let sessions: any[] = [];
  sessionMap.forEach((session, key) => {
    if (session && permissionService.hasPermission(session.origin)) {
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
