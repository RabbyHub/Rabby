/**
 * ============================================================================
 * Sentinel Trust Layer — Background Script
 * ============================================================================
 *
 * Runs in the extension's background service worker (MV3) or background page
 * (MV2). Responsibilities:
 *
 *   1. Message Handling — receives reports from the content script and
 *      orchestrates the TrustService to process them.
 *
 *   2. Polling — periodically queries Intuition's 1DB for recent flags
 *      on tweet URLs that are currently visible in the user's browser,
 *      then pushes updates back to the content script.
 *
 *   3. State Management — maintains the TrustService instance and the
 *      user's connected wallet address (from Rabby's existing wallet state).
 *
 * This module is designed to be imported and initialized from Rabby's existing
 * background script without modifying the core background logic.
 * ============================================================================
 */

import browser from 'webextension-polyfill';
import { isManifestV3 } from '@/utils/env';
import type { TweetTrustData, SentinelConfig } from '../types';
import { SENTINEL_DEFAULT_CONFIG, SENTINEL_MESSAGES } from '../constants';
import { TrustService } from '../services/TrustService';

const ALARM_SENTINEL_POLL = 'sentinel:poll';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let trustService: TrustService | null = null;
let config: SentinelConfig = { ...SENTINEL_DEFAULT_CONFIG };
let pollingTimer: ReturnType<typeof setInterval> | null = null;

/** Tweet URLs currently in the user's viewport (reported by content script) */
let visibleTweetUrls: string[] = [];

/** The user's connected wallet address (from Rabby's wallet state) */
let connectedWallet: string | null = null;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the Sentinel background service.
 *
 * Should be called once during the extension's background script startup.
 * This sets up the TrustService, message listeners, and polling loop.
 *
 * @param overrides — optional config overrides (e.g. from user settings)
 * @param walletAddress — the user's currently connected wallet address
 */
export function initSentinelBackground(
  overrides?: Partial<SentinelConfig>,
  walletAddress?: string
): void {
  config = { ...SENTINEL_DEFAULT_CONFIG, ...overrides };

  if (!config.enabled) {
    console.info('[Sentinel/Background] Sentinel is disabled');
    return;
  }

  trustService = new TrustService(config);
  connectedWallet = walletAddress ?? null;

  // Set up message listeners
  setupMessageListeners();

  // Start the background polling loop
  startPolling();

  console.info('[Sentinel/Background] Initialized successfully');
}

/**
 * Update the connected wallet address (called when user switches accounts).
 */
export function setConnectedWallet(walletAddress: string | null): void {
  connectedWallet = walletAddress;
}

/**
 * Shut down Sentinel background services cleanly.
 */
export function destroySentinelBackground(): void {
  if (isManifestV3) {
    browser.alarms.clear(ALARM_SENTINEL_POLL).catch(() => {});
  } else if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  trustService = null;
  visibleTweetUrls = [];
  console.info('[Sentinel/Background] Destroyed');
}

// ---------------------------------------------------------------------------
// Message Handling — content script ↔ background communication
// ---------------------------------------------------------------------------

/**
 * Set up browser.runtime.onMessage listeners for Sentinel-specific messages.
 *
 * Messages handled:
 *   - SUBMIT_REPORT: process a new report and return updated trust data
 *   - GET_TRUST_DATA: return cached trust data for given tweet URLs
 *   - GET_ETHOS_SCORE: fetch an Ethos score for a wallet address
 *   - TOGGLE_SENTINEL: enable/disable Sentinel
 */
function setupMessageListeners(): void {
  browser.runtime.onMessage.addListener((message: any, sender: any) => {
    // Only handle Sentinel messages
    if (!message?.type?.startsWith('sentinel:')) return undefined;

    switch (message.type) {
      case SENTINEL_MESSAGES.SUBMIT_REPORT:
        // Return a promise for async response (webextension-polyfill pattern)
        return handleSubmitReport(message.payload);

      case SENTINEL_MESSAGES.GET_TRUST_DATA:
        handleGetTrustData(message.payload, sender);
        return undefined;

      case SENTINEL_MESSAGES.GET_ETHOS_SCORE:
        return handleGetEthosScore(message.payload);

      case SENTINEL_MESSAGES.TOGGLE_SENTINEL:
        handleToggle(message.payload);
        return undefined;

      default:
        return undefined;
    }
  });
}

/**
 * Handle a SUBMIT_REPORT message from the content script.
 *
 * Flow:
 *   1. Validate that a wallet is connected
 *   2. Call TrustService.submitReport() with the report data
 *   3. Return the updated TweetTrustData to the content script
 */
async function handleSubmitReport(
  payload: {
    tweetUrl: string;
    tweetAuthorHandle: string;
    claimType: 'negative' | 'positive';
    context: string;
  }
): Promise<any> {
  if (!trustService) {
    return { error: 'Sentinel is not initialized' };
  }

  if (!connectedWallet) {
    return { error: 'No wallet connected. Please connect your wallet in Rabby.' };
  }

  try {
    // Try to resolve reporter's X handle from their Ethos profile
    const ethosService = trustService.getEthosService();
    const reporterHandle = await ethosService.getXHandleByAddress(connectedWallet).catch(() => null);

    const trustData = await trustService.submitReport(
      payload.tweetUrl,
      payload.tweetAuthorHandle,
      connectedWallet,
      reporterHandle ?? undefined,
      payload.claimType,
      payload.context
    );

    // Broadcast the update to all tabs showing x.com
    broadcastTrustDataUpdate([trustData]);

    return { trustData };
  } catch (error) {
    console.error('[Sentinel/Background] Report submission failed:', error);
    return { error: 'Report submission failed. Please try again.' };
  }
}

/**
 * Handle a GET_TRUST_DATA message — content script reports which tweet URLs
 * are visible, and we update the visible set for polling + return cached data.
 */
function handleGetTrustData(
  payload: { tweetUrls: string[] },
  sender: any
): void {
  if (!trustService) return;

  // Update the visible URLs set for the poller
  visibleTweetUrls = payload.tweetUrls || [];

  // Return any cached trust data we have
  const cachedData: TweetTrustData[] = [];
  for (const url of visibleTweetUrls) {
    const data = trustService.getTrustData(url);
    if (data) cachedData.push(data);
  }

  // Push cached data back to the requesting tab
  if (cachedData.length > 0 && sender.tab?.id) {
    browser.tabs.sendMessage(sender.tab.id, {
      type: SENTINEL_MESSAGES.TRUST_DATA_UPDATE,
      payload: { updates: cachedData },
    }).catch(() => {
      // Tab may not have content script loaded
    });
  }
}

/**
 * Handle a GET_ETHOS_SCORE message — fetch a score for a wallet address.
 */
async function handleGetEthosScore(
  payload: { walletAddress: string }
): Promise<any> {
  if (!trustService) {
    return { error: 'Sentinel is not initialized' };
  }

  try {
    const ethosService = trustService.getEthosService();
    const score = await ethosService.getScoreByAddress(payload.walletAddress);
    return { score };
  } catch (error) {
    return { error: 'Failed to fetch Ethos score' };
  }
}

/**
 * Handle a TOGGLE_SENTINEL message — enable or disable Sentinel.
 */
function handleToggle(payload: { enabled: boolean }): void {
  config.enabled = payload.enabled;

  if (!config.enabled) {
    destroySentinelBackground();
  } else if (!trustService) {
    initSentinelBackground(config, connectedWallet ?? undefined);
  }
}

// ---------------------------------------------------------------------------
// Background Polling — periodic sync with Intuition 1DB
// ---------------------------------------------------------------------------

/**
 * Start the background polling loop.
 *
 * Every `config.pollingIntervalMs` (default 30s), the poller:
 *   1. Takes the current set of visible tweet URLs
 *   2. Queries Intuition 1DB for triples (claims) on those URLs
 *   3. Aggregates the data into TweetTrustData objects
 *   4. Pushes updates to all content scripts on x.com tabs
 *
 * This ensures that badges update in near-real-time as the community
 * submits new reports — even if the user hasn't interacted.
 */
/** Execute a single poll cycle */
async function pollCycle(): Promise<void> {
  if (!trustService || visibleTweetUrls.length === 0) return;

  try {
    const intuitionService = trustService.getIntuitionService();

    // Query Intuition for all visible tweet URLs
    const triplesMap = await intuitionService.getTriplesForUrls(visibleTweetUrls);

    // Merge on-chain triples into local trust data (converts positions to reports)
    const updates = trustService.mergeIntuitionTriples(triplesMap);

    // Broadcast updates to all x.com tabs
    if (updates.length > 0) {
      broadcastTrustDataUpdate(updates);
    }

    // Prune stale entries from memory
    trustService.pruneStaleEntries(new Set(visibleTweetUrls));
  } catch (error) {
    console.warn('[Sentinel/Background] Polling cycle failed:', error);
  }
}

function startPolling(): void {
  const periodMs = config.pollingIntervalMs;

  if (isManifestV3) {
    // MV3: use browser.alarms (survives service worker restarts)
    browser.alarms.clear(ALARM_SENTINEL_POLL).catch(() => {});
    const periodInMinutes = Math.max(periodMs / 60_000, 0.5); // alarms minimum is 30s
    browser.alarms.create(ALARM_SENTINEL_POLL, {
      delayInMinutes: periodInMinutes,
      periodInMinutes,
    });
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === ALARM_SENTINEL_POLL) {
        pollCycle();
      }
    });
  } else {
    // MV2: use setInterval
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(pollCycle, periodMs);
  }

  console.info(
    `[Sentinel/Background] Polling started (every ${periodMs / 1000}s, MV${isManifestV3 ? '3' : '2'})`
  );
}

// ---------------------------------------------------------------------------
// Broadcasting — push updates to all x.com content scripts
// ---------------------------------------------------------------------------

/**
 * Broadcast trust data updates to all tabs on x.com / twitter.com.
 */
async function broadcastTrustDataUpdate(updates: TweetTrustData[]): Promise<void> {
  try {
    const tabs = await browser.tabs.query({ url: ['*://x.com/*', '*://twitter.com/*'] });
    for (const tab of tabs) {
      if (tab.id) {
        browser.tabs.sendMessage(tab.id, {
          type: SENTINEL_MESSAGES.TRUST_DATA_UPDATE,
          payload: { updates },
        }).catch(() => {
          // Tab may not have content script loaded
        });
      }
    }
  } catch {
    // tabs.query may fail if extension context is invalidated
  }
}
