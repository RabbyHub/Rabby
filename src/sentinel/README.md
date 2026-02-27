# Sentinel Trust Layer

> A decentralized security feature for Rabby Wallet that turns the extension into a proactive firewall for social media, specifically targeting **X (formerly Twitter)**.

## Overview

Sentinel identifies hacks, exploits, and phishing links in real-time by bridging two Web3 systems:

- **[Intuition Systems](https://www.docs.intuition.systems/docs)** — Structured knowledge graph (Atoms, Triples, Signals) for storing and querying claims about tweet URLs
- **[Ethos Network](https://developers.ethos.network/)** — Web3 reputation scoring that weights each report by the reporter's credibility

Together, they solve the **"Flash-Hack" social media problem** — where compromised accounts post phishing links that spread virally before anyone can warn others.

## Architecture

```
src/sentinel/
├── types.ts                          # TypeScript type definitions
├── constants.ts                      # Configuration, thresholds, DOM selectors
├── index.ts                          # Barrel export for the module
├── README.md                         # This file
│
├── services/
│   ├── TrustService.ts               # Core engine: confidence calc, report flow
│   ├── EthosService.ts               # Ethos Network API client (score fetching)
│   ├── IntuitionService.ts           # Intuition protocol client (atoms/triples)
│   └── index.ts                      # Services barrel export
│
├── ui/
│   ├── styles.ts                     # Full CSS stylesheet (injected into Shadow DOM)
│   ├── Badge.ts                      # Conviction badge (pill above tweet text)
│   ├── ActionButtons.ts              # Red (Scam) / Green (Legit) report buttons
│   ├── ContextModal.ts               # Text input modal for report context
│   ├── Sidebar.ts                    # Slide-out panel: First Responder + Council
│   └── index.ts                      # UI barrel export
│
├── content-script/
│   ├── SentinelInjector.ts           # MutationObserver + tweet injection engine
│   └── index.ts                      # Content script entry point (webpack)
│
└── background/
    ├── SentinelBackground.ts         # Background service: messages, polling, state
    └── index.ts                      # Background barrel export
```

## How It Works

### 1. Content Script (x.com only)

- A `MutationObserver` watches for `[data-testid='tweet']` elements
- For each tweet, Sentinel injects:
  - **Red/Green buttons** in the action bar (next to Like, Retweet, Share)
  - **Conviction badge** above tweet text (if reports exist)
- All UI is rendered inside a **Shadow DOM** to prevent style collisions
- Debounced mutation processing (100ms) for zero CPU impact

### 2. Reputation-Weighted Confidence

Every report's weight = `ethosScore²`

```
Net Score = Σ(negative weights) - Σ(positive weights)

< 0           → "Safe"
0 – 1M        → "Unverified" (no badge)
1M – 10M      → "Likely Scam"
10M+          → "Verified Scam"
```

**Contested Content**: If both sides exceed 1M and the smaller is ≥40% of the larger, the tweet is marked "Contested Content."

**Integrity Check**: If the reporter's X handle matches the tweet author → weight = 0 (no self-reporting).

### 3. The Sentinel Sidebar

Clicking a badge opens a slide-out panel showing:

- 🏆 **The Whistleblower** — First account to report (regardless of score)
- 🏛️ **The Council** — Top 5 reporters by Ethos score
- Each entry shows: handle/wallet, Ethos score, claim type, and context note
- ⚠️ "Low Credibility" warning if First Responder has Ethos score ≤ 0

### 4. Background Polling

- Every 30s, the background script queries Intuition's 1DB for claims on visible tweet URLs
- Updates are pushed to all x.com tabs via `chrome.runtime.sendMessage`
- Stale entries are pruned when tweets leave the viewport

## Integration Points

### Webpack

The Sentinel content script is a separate webpack entry:

```js
// build/webpack.common.config.js
'sentinel-content-script': paths.rootResolve('src/sentinel/content-script/index.ts'),
```

### Manifest

All manifest variants (MV2/MV3, Chrome/Firefox) include:

```json
{
  "matches": ["*://x.com/*", "*://twitter.com/*"],
  "js": ["sentinel-content-script.js"],
  "run_at": "document_idle"
}
```

### Background Script

Initialize Sentinel from Rabby's background script:

```typescript
import { initSentinelBackground, setConnectedWallet } from '@/sentinel';

// During background init:
initSentinelBackground();

// When wallet changes:
setConnectedWallet(newWalletAddress);
```

## API Dependencies

### Ethos Network (v2)

- **Base URL**: `https://api.ethos.network`
- **Score endpoint**: `GET /api/v2/score/{address}`
- **Batch scores**: `POST /api/v2/score/addresses`
- **Required header**: `X-Ethos-Client: rabby-sentinel@1.0.0`
- **No auth required** for public score lookups

### Intuition Systems

- **Base URL**: `https://api.i7n.app`
- **Atoms**: `POST /atoms` (create), `GET /atoms?value=...` (query)
- **Triples**: `POST /triples` (create claim), `GET /triples?subject_value=...` (query)
- **Optional API key** for write operations

## Quick Start — Testing Locally

### Prerequisites

- **Node.js** >= 16
- **Yarn** 1.x
- **Chrome** or **Brave** (Chromium-based browser)

### 1. Clone & Build

```bash
git clone https://github.com/ronniethedevv/Rabby.git
cd Rabby
git checkout feat/sentinel-trust-layer
yarn install
export NODE_OPTIONS="--max-old-space-size=8192"
yarn build:dev
```

> The build may take 5–10 minutes depending on your machine.

### 2. Load in Chrome

1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder inside the cloned repo

### 3. Test on X (Twitter)

1. Go to [https://x.com](https://x.com) and scroll through your timeline
2. You should see:
   - **Red / Green report buttons** in the action bar of each tweet (next to Like, Retweet, Share)
   - **Conviction badges** above tweets that have existing reports:
     - **Green (Safe)** — high Ethos score, positive attestations
     - **Red (Verified Scam)** — low Ethos score, strong negative attestations
     - **Orange (Likely Scam)** — moderate negative signal
     - **Blue (Contested Content)** — significant reports on both sides
     - **Gray outline (Unverified)** — insufficient data
3. Click any badge to open the **Sentinel Sidebar** showing the Whistleblower and Council breakdown
4. Click the Red or Green button to submit a report (connects to your wallet)

### 4. Run the Tests

```bash
yarn test
```

- **29 unit tests** — conviction math, weight calculation, triple merging, aggregation
- **9 API integration tests** — live calls to Ethos Network v2 and Intuition Systems GraphQL

All 38 tests should pass.

## Design Principles

1. **Modular** — All Sentinel logic lives in `src/sentinel/`. Zero changes to Rabby core.
2. **Performant** — Debounced MutationObserver, cached API responses, batched queries.
3. **Native-looking** — Uses Rabby's color palette, Shadow DOM isolation, dark mode support.
4. **Graceful degradation** — If APIs are unreachable, reports still work with local-only data.
5. **Accessible** — All interactive elements have ARIA labels and keyboard support.

## Configuration

Edit `src/sentinel/constants.ts` to tune:

- Conviction thresholds
- Polling interval
- Contested content ratio
- API base URLs
- Council size
