import { permissionService } from 'background/service';
import { Object } from 'ts-toolbelt';
import PortMessage from '@/utils/message/portMessage';

export interface SessionProp {
  origin: string;
  icon: string;
  name: string;
}

export class Session {
  origin = '';

  icon = '';

  name = '';

  pm: PortMessage | null = null;

  pushMessage(event, data) {
    if (this.pm) {
      this.pm.send('message', { event, data });
    }
  }

  constructor(data?: SessionProp | null) {
    if (data) {
      this.setProp(data);
    }
  }

  setPortMessage(pm: PortMessage) {
    this.pm = pm;
  }

  setProp({ origin, icon, name }: SessionProp) {
    this.origin = origin;
    this.icon = icon;
    this.name = name;
  }
}

// for each tab
const sessionMap = new Map<number, Session | null>();

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

  return session;
};

const deleteSession = (id) => {
  sessionMap.delete(id);
};

const broadcastEvent = (ev, data?, origin?: string) => {
  let sessions: { key: number; data: Session }[] = [];
  sessionMap.forEach((session, key) => {
    if (session && permissionService.hasPermission(session.origin)) {
      sessions.push({
        key,
        data: session,
      });
    }
  });

  // same origin
  if (origin) {
    sessions = sessions.filter((session) => session.data.origin === origin);
  }

  sessions.forEach((session) => {
    try {
      session.data.pushMessage?.(ev, data);
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
