/**
 * ============================================================================
 * Sentinel Trust Layer — Content Script Entry Point
 * ============================================================================
 *
 * This file is the webpack entry point for the Sentinel content script.
 * It bootstraps the Sentinel injector on x.com / twitter.com pages.
 *
 * The script is loaded as a separate content_scripts entry in manifest.json,
 * matching only x.com and twitter.com domains. It runs at "document_idle"
 * to ensure the DOM is ready before injection begins.
 * ============================================================================
 */

import { initSentinelInjector } from './SentinelInjector';

// Boot Sentinel when the content script loads
initSentinelInjector();
