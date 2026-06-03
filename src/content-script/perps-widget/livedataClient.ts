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

type SnapshotListener = (snapshot: PerpsLiveSnapshot | null) => void;
type WsStateListener = (state: PerpsLiveWsState) => void;
type TeardownCallback = () => void;

class LivedataClient {
  private port: browser.Runtime.Port | null = null;
  private latest: PerpsLiveSnapshot | null = null;
  private wsState: PerpsLiveWsState = 'closed';

  private snapshotListeners = new Set<SnapshotListener>();
  private wsStateListeners = new Set<WsStateListener>();
  private teardownCallbacks = new Set<TeardownCallback>();

  private reconnectTimer: number | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    this.connect();
  }

  private connect(): void {
    if (this.port) return;
    try {
      this.port = browser.runtime.connect({ name: PERPS_LIVE_PORT_NAME });
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.port.onMessage.addListener((msg: unknown) => {
      this.handle(msg as PerpsLiveBroadcast);
    });
    // SW upgrade / crash disconnects the port. SDK has its own WS reconnect;
    // this is a second safety net for the port channel itself.
    this.port.onDisconnect.addListener(() => {
      this.port = null;
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer != null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 1500);
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
        this.notifyWsState();
        break;
    }
  }

  private notifySnapshot(): void {
    for (const l of this.snapshotListeners) l(this.latest);
  }

  private notifyWsState(): void {
    for (const l of this.wsStateListeners) l(this.wsState);
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

  subscribeWsState(listener: WsStateListener): () => void {
    this.wsStateListeners.add(listener);
    listener(this.wsState);
    return () => {
      this.wsStateListeners.delete(listener);
    };
  }

  registerTeardown(cb: TeardownCallback): () => void {
    this.teardownCallbacks.add(cb);
    return () => {
      this.teardownCallbacks.delete(cb);
    };
  }
}

export const livedataClient = new LivedataClient();
export default livedataClient;
