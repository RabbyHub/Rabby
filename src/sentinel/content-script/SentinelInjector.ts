/**
 * ============================================================================
 * Sentinel Trust Layer — Content Script Injector
 * ============================================================================
 *
 * This is the heart of the Sentinel content script. It runs on x.com and:
 *
 *   1. Creates a Shadow DOM host to encapsulate Sentinel UI and styles.
 *   2. Uses a MutationObserver to detect new tweets ([data-testid='tweet']).
 *   3. Injects action buttons (Red/Green) into each tweet's action bar.
 *   4. Injects conviction badges above tweet text when trust data exists.
 *   5. Communicates with the background script for data persistence/fetching.
 *
 * Performance optimizations:
 *   - MutationObserver uses a targeted subtree filter on the main timeline.
 *   - Debounced processing to batch DOM mutations.
 *   - WeakSet tracks already-processed tweets to avoid double-injection.
 *   - requestIdleCallback for non-critical UI updates.
 *
 * The content script does NOT import heavy dependencies (no React, no Tailwind).
 * All UI is built with plain DOM APIs rendered inside a Shadow DOM boundary.
 * ============================================================================
 */

import browser from 'webextension-polyfill';
import type { TweetTrustData } from '../types';
import {
  SENTINEL_CSS_PREFIX,
  SELECTOR_TWEET,
  SELECTOR_TWEET_TEXT,
  SELECTOR_TWEET_ACTIONS,
  SENTINEL_MESSAGES,
} from '../constants';
import { getSentinelStyles } from '../ui/styles';
import { createBadge, updateBadge } from '../ui/Badge';
import { createActionButtons } from '../ui/ActionButtons';
import { showContextModal } from '../ui/ContextModal';
import { showSidebar } from '../ui/Sidebar';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Tracks tweet elements we've already injected into — prevents double-injection */
const processedTweets = new WeakSet<Element>();

/** Maps tweet URL → current badge element (for live updates from poller) */
const activeBadges = new Map<string, HTMLElement>();

/** Maps tweet URL → current trust data (synced from background) */
const trustDataCache = new Map<string, TweetTrustData>();

/** Shadow DOM host for modals/sidebar (page-level, not per-tweet) */
let globalShadowHost: HTMLElement | null = null;
let globalShadowRoot: ShadowRoot | null = null;

/** Debounce timer for mutation processing */
let mutationDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Set of tweet URLs currently visible (for background poller pruning) */
const visibleTweetUrls = new Set<string>();

/** Whether Sentinel TL Protection is enabled (user toggle) */
let sentinelEnabled = false;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the Sentinel content script.
 * Called once when the content script loads on x.com.
 */
export function initSentinelInjector(): void {
  // Only run on x.com / twitter.com
  if (
    !window.location.hostname.includes('x.com') &&
    !window.location.hostname.includes('twitter.com')
  ) {
    return;
  }

  console.info('[Sentinel] Initializing content script on', window.location.hostname);

  // Check if TL Protection is enabled before injecting anything
  checkTLProtectionEnabled().then((enabled) => {
    sentinelEnabled = enabled;

    if (!sentinelEnabled) {
      console.info('[Sentinel] TL Protection is OFF — Sentinel inactive');
      // Still listen for toggle messages so we can activate later
      listenForBackgroundMessages();
      return;
    }

    bootSentinel();
  });
}

/**
 * Check whether TL Protection is enabled in storage.
 * Defaults to false (opt-in) so users aren't surprised by UI on every tweet.
 */
async function checkTLProtectionEnabled(): Promise<boolean> {
  try {
    const result = await browser.storage.local.get('sentinel_tl_protection');
    return result.sentinel_tl_protection === true;
  } catch {
    return false;
  }
}

/**
 * Boot the Sentinel UI — called when TL Protection is confirmed enabled.
 */
function bootSentinel(): void {
  // Create the global Shadow DOM host for modals and sidebar
  createGlobalShadowHost();

  // Start observing the DOM for new tweets
  startMutationObserver();

  // Process any tweets already on the page
  processExistingTweets();

  // Listen for trust data updates from the background script
  listenForBackgroundMessages();

  // Periodically notify background of visible tweet URLs (for polling)
  startViewportSync();
}

// ---------------------------------------------------------------------------
// Shadow DOM Setup
// ---------------------------------------------------------------------------

/**
 * Create a global Shadow DOM host attached to document.body.
 * This hosts modals and the sidebar — isolated from X's styles.
 */
function createGlobalShadowHost(): void {
  if (globalShadowHost) return;

  globalShadowHost = document.createElement('div');
  globalShadowHost.id = `${SENTINEL_CSS_PREFIX}-global-host`;
  globalShadowHost.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;pointer-events:none;';

  globalShadowRoot = globalShadowHost.attachShadow({ mode: 'open' });

  // Inject styles into shadow root
  const styleEl = document.createElement('style');
  styleEl.textContent = getSentinelStyles();
  globalShadowRoot.appendChild(styleEl);

  // Container for dynamic content (modals, sidebar)
  const container = document.createElement('div');
  container.className = `${SENTINEL_CSS_PREFIX}-root`;
  container.style.pointerEvents = 'auto';
  globalShadowRoot.appendChild(container);

  document.body.appendChild(globalShadowHost);
}

/**
 * Get the shadow root container for rendering modals/sidebar.
 */
function getShadowContainer(): HTMLElement | null {
  return globalShadowRoot?.querySelector(`.${SENTINEL_CSS_PREFIX}-root`) ?? null;
}

// ---------------------------------------------------------------------------
// MutationObserver — watches for new tweets in the DOM
// ---------------------------------------------------------------------------

/**
 * Start observing the DOM for new tweet elements.
 *
 * We observe document.body with subtree: true, but filter aggressively
 * in the callback to only process relevant mutations.
 */
function startMutationObserver(): void {
  const observer = new MutationObserver((mutations) => {
    // Debounce: batch rapid DOM changes into a single processing pass
    if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
    mutationDebounceTimer = setTimeout(() => {
      processMutations(mutations);
    }, 100); // 100ms debounce — fast enough for UX, light on CPU
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.info('[Sentinel] MutationObserver started');
}

/**
 * Process a batch of DOM mutations, looking for new tweet elements.
 */
function processMutations(mutations: MutationRecord[]): void {
  const newTweets: Element[] = [];

  for (const mutation of mutations) {
    for (const node of Array.from(mutation.addedNodes)) {
      if (!(node instanceof Element)) continue;

      // Check if the added node IS a tweet
      if (node.matches?.(SELECTOR_TWEET) && !processedTweets.has(node)) {
        newTweets.push(node);
      }

      // Check if the added node CONTAINS tweets
      const contained = node.querySelectorAll?.(SELECTOR_TWEET);
      if (contained) {
        for (const tweet of Array.from(contained)) {
          if (!processedTweets.has(tweet)) {
            newTweets.push(tweet);
          }
        }
      }
    }
  }

  if (newTweets.length > 0) {
    for (const tweet of newTweets) {
      injectSentinelIntoTweet(tweet);
    }
  }
}

/**
 * Process tweets that are already on the page when the script loads.
 */
function processExistingTweets(): void {
  const tweets = document.querySelectorAll(SELECTOR_TWEET);
  for (const tweet of Array.from(tweets)) {
    if (!processedTweets.has(tweet)) {
      injectSentinelIntoTweet(tweet);
    }
  }
  console.info(`[Sentinel] Processed ${tweets.length} existing tweets`);
}

// ---------------------------------------------------------------------------
// Tweet Injection — the core per-tweet injection logic
// ---------------------------------------------------------------------------

/**
 * Inject Sentinel UI into a single tweet element.
 *
 * This adds:
 *   1. Action buttons (Red/Green) to the tweet's action bar
 *   2. A conviction badge above the tweet text (if trust data exists)
 */
function injectSentinelIntoTweet(tweetEl: Element): void {
  // Mark as processed immediately to prevent race conditions
  processedTweets.add(tweetEl);

  // Extract the tweet URL from the tweet's permalink
  const tweetUrl = extractTweetUrl(tweetEl);
  if (!tweetUrl) return;

  // Extract the tweet author's handle
  const authorHandle = extractAuthorHandle(tweetEl);

  // Track this tweet as visible
  visibleTweetUrls.add(tweetUrl);

  // --- Inject Action Buttons only on tweets that contain external links ---
  // Most scam tweets are phishing links — plain text tweets rarely need flagging.
  // This reduces visual noise significantly.
  const hasExternalLink = tweetContainsLink(tweetEl);

  if (hasExternalLink) {
    const actionBar = tweetEl.querySelector(SELECTOR_TWEET_ACTIONS);
    if (actionBar) {
      const buttons = createActionButtons({
        onScamClick: () => openContextModal(tweetUrl, authorHandle, 'negative'),
        onLegitClick: () => openContextModal(tweetUrl, authorHandle, 'positive'),
      });
      // Append to the end of the action bar
      actionBar.appendChild(buttons);
    }
  }

  // --- Inject Badge if trust data exists ---
  const existingData = trustDataCache.get(tweetUrl);
  if (existingData && existingData.conviction !== 'Unverified') {
    injectBadge(tweetEl, tweetUrl, existingData);
  }
}

/**
 * Inject or update the conviction badge above the tweet text.
 */
function injectBadge(
  tweetEl: Element,
  tweetUrl: string,
  trustData: TweetTrustData
): void {
  const tweetTextEl = tweetEl.querySelector(SELECTOR_TWEET_TEXT);
  if (!tweetTextEl) return;

  // Check if we already have a badge for this tweet
  const existingBadge = activeBadges.get(tweetUrl);
  if (existingBadge) {
    updateBadge(existingBadge, trustData.conviction);
    return;
  }

  // Create a new badge
  const badge = createBadge(trustData.conviction, () => {
    openSidebar(trustData);
  });

  if (badge) {
    // Insert the badge ABOVE the tweet text
    tweetTextEl.parentElement?.insertBefore(badge, tweetTextEl);
    activeBadges.set(tweetUrl, badge);
  }
}

// ---------------------------------------------------------------------------
// URL & Handle Extraction
// ---------------------------------------------------------------------------

/**
 * Extract the canonical tweet URL from a tweet element.
 *
 * X embeds a permalink in each tweet as an <a> with href like
 * /username/status/123456789. We reconstruct the full URL.
 */
function extractTweetUrl(tweetEl: Element): string | null {
  // Look for the timestamp link which contains the tweet permalink
  const links = tweetEl.querySelectorAll('a[href*="/status/"]');
  for (const link of Array.from(links)) {
    const href = link.getAttribute('href');
    if (href && /^\/\w+\/status\/\d+/.test(href)) {
      return `https://x.com${href}`;
    }
  }
  return null;
}

/**
 * Extract the tweet author's X handle from the tweet element.
 */
function extractAuthorHandle(tweetEl: Element): string {
  // X renders the author handle in a link with href like /username
  const userLinks = tweetEl.querySelectorAll('a[role="link"][href^="/"]');
  for (const link of Array.from(userLinks)) {
    const href = link.getAttribute('href');
    if (href && /^\/\w+$/.test(href) && !href.includes('/status/')) {
      return href.replace('/', '@');
    }
  }
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Link Detection — only show action buttons on tweets with external links
// ---------------------------------------------------------------------------

/**
 * Check whether a tweet contains an external link (t.co shortened URL).
 *
 * X wraps all external URLs in t.co redirects. We look for <a> tags pointing
 * to t.co, which covers links, card previews, and embedded URLs. This excludes
 * internal links like @mentions, hashtags, and the tweet permalink itself.
 */
function tweetContainsLink(tweetEl: Element): boolean {
  const tweetTextEl = tweetEl.querySelector(SELECTOR_TWEET_TEXT);
  if (!tweetTextEl) return false;

  const links = tweetTextEl.querySelectorAll('a[href]');
  for (const link of Array.from(links)) {
    const href = link.getAttribute('href') || '';
    // t.co links are external URLs; skip @mentions and hashtags
    if (href.includes('t.co/') || href.startsWith('http')) {
      return true;
    }
  }

  // Also check for card links (embedded URL previews outside tweetText)
  const cardLink = tweetEl.querySelector('[data-testid="card.wrapper"] a[href]');
  if (cardLink) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Modal & Sidebar Triggers
// ---------------------------------------------------------------------------

/**
 * Open the context modal for a report submission.
 */
function openContextModal(
  tweetUrl: string,
  authorHandle: string,
  claimType: 'negative' | 'positive'
): void {
  const container = getShadowContainer();
  if (!container) return;

  const overlay = showContextModal({
    claimType,
    tweetUrl,
    onSubmit: (context: string) => {
      submitReportToBackground(tweetUrl, authorHandle, claimType, context);
    },
    onCancel: () => {
      // Modal self-removes on cancel
    },
  });

  container.appendChild(overlay);
}

/**
 * Open the Sentinel sidebar with full report details.
 */
function openSidebar(trustData: TweetTrustData): void {
  const container = getShadowContainer();
  if (!container) return;

  const { overlay, sidebar } = showSidebar(trustData, () => {
    // Cleanup handled by showSidebar internals
  });

  container.appendChild(overlay);
  container.appendChild(sidebar);
}

// ---------------------------------------------------------------------------
// Background Script Communication
// ---------------------------------------------------------------------------

/**
 * Send a report submission to the background script via browser.runtime.
 */
async function submitReportToBackground(
  tweetUrl: string,
  authorHandle: string,
  claimType: 'negative' | 'positive',
  context: string
): Promise<void> {
  try {
    const response = await browser.runtime.sendMessage({
      type: SENTINEL_MESSAGES.SUBMIT_REPORT,
      payload: {
        tweetUrl,
        tweetAuthorHandle: authorHandle,
        claimType,
        context,
      },
    });

    if (response?.trustData) {
      handleTrustDataUpdate(response.trustData);
    }
  } catch (error) {
    console.warn('[Sentinel] Failed to send report to background:', error);
  }
}

/**
 * Remove all Sentinel-injected UI elements from the page.
 * Called when the user toggles TL Protection off.
 */
function removeSentinelUI(): void {
  // Remove the global shadow host (modals, sidebar)
  if (globalShadowHost) {
    globalShadowHost.remove();
    globalShadowHost = null;
    globalShadowRoot = null;
  }

  // Remove all injected action buttons and badges from tweets
  const prefix = SENTINEL_CSS_PREFIX;
  document.querySelectorAll(`.${prefix}-actions`).forEach((el) => el.remove());

  // Clear active badges
  for (const badge of activeBadges.values()) {
    badge.remove();
  }
  activeBadges.clear();
  trustDataCache.clear();
  visibleTweetUrls.clear();
}

/**
 * Listen for trust data updates pushed from the background script.
 */
function listenForBackgroundMessages(): void {
  try {
    browser.runtime.onMessage.addListener((message: any) => {
      if (message.type === SENTINEL_MESSAGES.TRUST_DATA_UPDATE) {
        const updates: TweetTrustData[] = message.payload?.updates || [];
        for (const update of updates) {
          handleTrustDataUpdate(update);
        }
      }

      // Handle TL Protection toggle — activate/deactivate Sentinel live
      if (message.type === SENTINEL_MESSAGES.TOGGLE_SENTINEL) {
        const nowEnabled = message.payload?.enabled === true;
        if (nowEnabled && !sentinelEnabled) {
          sentinelEnabled = true;
          bootSentinel();
          console.info('[Sentinel] TL Protection turned ON');
        } else if (!nowEnabled && sentinelEnabled) {
          sentinelEnabled = false;
          // Remove all injected Sentinel UI from the page
          removeSentinelUI();
          console.info('[Sentinel] TL Protection turned OFF');
        }
      }

      return undefined;
    });
  } catch (error) {
    console.warn('[Sentinel] Failed to set up message listener:', error);
  }
}

/**
 * Handle an incoming trust data update for a single tweet.
 * Updates the local cache and refreshes any visible badge.
 */
function handleTrustDataUpdate(trustData: TweetTrustData): void {
  trustDataCache.set(trustData.tweetUrl, trustData);

  // Update existing badge if present
  const existingBadge = activeBadges.get(trustData.tweetUrl);
  if (existingBadge) {
    if (trustData.conviction === 'Unverified') {
      // Remove badge if conviction dropped to Unverified
      existingBadge.remove();
      activeBadges.delete(trustData.tweetUrl);
    } else {
      updateBadge(existingBadge, trustData.conviction);
    }
  } else if (trustData.conviction !== 'Unverified') {
    // Try to find the tweet element and inject a new badge
    const tweetEls = document.querySelectorAll(SELECTOR_TWEET);
    for (const tweetEl of Array.from(tweetEls)) {
      const url = extractTweetUrl(tweetEl);
      if (url === trustData.tweetUrl) {
        injectBadge(tweetEl, trustData.tweetUrl, trustData);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Viewport Sync — tells background which tweet URLs are currently visible
// ---------------------------------------------------------------------------

/**
 * Periodically send the set of visible tweet URLs to the background script.
 * This allows the background poller to focus on just the relevant URLs.
 */
function startViewportSync(): void {
  setInterval(() => {
    // Refresh the visible set by scanning current DOM
    visibleTweetUrls.clear();
    const tweets = document.querySelectorAll(SELECTOR_TWEET);
    for (const tweet of Array.from(tweets)) {
      const url = extractTweetUrl(tweet);
      if (url) visibleTweetUrls.add(url);
    }

    // Send to background
    if (visibleTweetUrls.size > 0) {
      try {
        browser.runtime.sendMessage({
          type: SENTINEL_MESSAGES.GET_TRUST_DATA,
          payload: { tweetUrls: Array.from(visibleTweetUrls) },
        }).catch(() => {
          // Extension context may be invalidated
        });
      } catch {
        // Extension context may be invalidated
      }
    }
  }, 15_000); // Every 15 seconds — half the polling interval
}

