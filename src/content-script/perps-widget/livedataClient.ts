/**
 * content-script port client — connects to 'perps-live' port, caches the latest broadcast,
 * exposes a subscribe API to UI components.
 */

import browser from 'webextension-polyfill';
import {
  PerpsLiveBroadcast,
  PerpsLiveSnapshot,
  PerpsLiveWsState,
  PERPS_LIVE_PORT_NAME,
} from '@/utils/message/perpsLive';

/** Extension upgrade/disable/uninstall flips runtime.id to undefined. */
function isExtensionContextValid(): boolean {
  return !!browser?.runtime?.id;
}

/** Poll interval for the context-invalidation watch. */
const CONTEXT_WATCH_MS = 2000;

type SnapshotListener = (snapshot: PerpsLiveSnapshot | null) => void;
type TeardownCallback = () => void;

class LivedataClient {
  private port: browser.Runtime.Port | null = null;
  private latest: PerpsLiveSnapshot | null = null;
  private wsState: PerpsLiveWsState = 'closed';

  private snapshotListeners = new Set<SnapshotListener>();
  private teardownCallbacks = new Set<TeardownCallback>();

  private reconnectTimer: number | null = null;
  private started = false;
  /** Set once the context is gone for good — blocks any further reconnect/start. */
  private dead = false;
  /** See startContextWatch. */
  private contextWatchTimer: number | null = null;

  start(): void {
    if (this.started || this.dead) return;
    this.started = true;
    this.connect();
    this.startContextWatch();
  }

  private connect(): void {
    if (this.dead || this.port) return;
    // Context already dead — don't reconnect onto a dead runtime.
    if (!isExtensionContextValid()) {
      this.teardown();
      return;
    }
    try {
      this.port = browser.runtime.connect({ name: PERPS_LIVE_PORT_NAME });
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.port.onMessage.addListener((msg: unknown) => {
      this.handle(msg as PerpsLiveBroadcast);
    });
    // Reconnect on disconnect; a dead context is caught by connect() + the watch.
    this.port.onDisconnect.addListener(() => {
      this.port = null;
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.dead || this.reconnectTimer != null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1500);
  }

  /**
   * Reliable teardown trigger: extension reload does NOT fire port.onDisconnect on an
   * orphaned content script, but it flips runtime.id to undefined. Poll for that.
   */
  private startContextWatch(): void {
    if (this.contextWatchTimer != null) return;
    this.contextWatchTimer = window.setInterval(() => {
      if (!isExtensionContextValid()) {
        this.teardown();
      }
    }, CONTEXT_WATCH_MS);
  }

  private handle(msg: PerpsLiveBroadcast): void {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'SNAPSHOT':
        this.latest = msg.snapshot;
        this.notifySnapshot();
        break;
      case 'CLEARED':
        // Don't fire teardownCallbacks: CLEARED includes recoverable states
        // (account temporarily null, grace stop, etc.) — hard unmount would
        // prevent the UI from coming back when SNAPSHOT resumes.
        this.latest = null;
        this.notifySnapshot();
        break;
      case 'WS_STATE':
        this.wsState = msg.state;
        break;
    }
  }

  private notifySnapshot(): void {
    for (const l of this.snapshotListeners) l(this.latest);
  }

  getLatest(): PerpsLiveSnapshot | null {
    return this.latest;
  }

  getWsState(): PerpsLiveWsState {
    return this.wsState;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.snapshotListeners.add(listener);
    listener(this.latest);
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  /** Context died for good: stop timers/port and fire teardown callbacks so the orphaned widget removes itself. */
  private teardown(): void {
    if (this.dead) return;
    this.dead = true;
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.contextWatchTimer != null) {
      window.clearInterval(this.contextWatchTimer);
      this.contextWatchTimer = null;
    }
    if (this.port) {
      try {
        this.port.disconnect();
      } catch {
        /* ignore */
      }
      this.port = null;
    }
    for (const cb of this.teardownCallbacks) {
      try {
        cb();
      } catch {
        /* ignore */
      }
    }
    this.teardownCallbacks.clear();
  }

  registerTeardown(cb: TeardownCallback): () => void {
    // teardown may have already fired before the UI registered.
    if (this.dead) {
      try {
        cb();
      } catch {
        /* ignore */
      }
      return () => {};
    }
    this.teardownCallbacks.add(cb);
    return () => {
      this.teardownCallbacks.delete(cb);
    };
  }
}

export const livedataClient = new LivedataClient();
export default livedataClient;
