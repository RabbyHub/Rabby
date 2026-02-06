import type { StepConfig } from '@/content-script/auto-click-runner';

export const rules: Record<string, StepConfig[]> = {
  'https://polymarket.com': [
    {
      wait: {
        path: [
          { css: 'nav' },
          { within: true },
          { text: 'Log In', selector: 'button' },
          { enabled: true },
        ],
      },
      action: { type: 'click' },
    },
    {
      wait: {
        path: [
          {
            attr: {
              selector: 'div.fixed',
              name: 'role',
              value: 'dialog',
              mode: 'equals',
            },
          },
          { within: true },
          {
            attr: {
              selector: 'img',
              name: 'alt',
              value: 'Rabby',
              mode: 'startsWith',
            },
          },
          { closest: 'button' },
          { enabled: true },
        ],
      },
      action: { type: 'click' },
    },
  ],
  'https://app.spark.fi': [
    {
      wait: {
        path: [
          { css: 'span > span.hidden.sm\\:inline.md\\:hidden.lg\\:inline' },
          { closest: "button, a, [role='button']" },
        ],
      },
      action: { type: 'click' },
    },
    {
      wait: {
        path: [
          { css: 'body > w3m-modal' },
          { shadow: true },

          { css: 'wui-flex > wui-card > w3m-router' },
          { shadow: true },

          { css: 'w3m-router-container > w3m-connect-view' },
          { shadow: true },

          { css: 'wui-flex > wui-flex > wui-flex > w3m-wallet-login-list' },
          { shadow: true },

          { css: 'wui-flex > w3m-connector-list' },
          { shadow: true },

          { css: 'wui-flex' },

          { css: "w3m-list-wallet[name^='Rabby']" },
          { enabled: true },
        ],
      },
      action: { type: 'click' },
    },
  ],
  'https://venus.io': [
    {
      wait: {
        path: [
          {
            css: 'nav button>span:only-child:not(:has(*))',
          },
          { enabled: true },
        ],
      },
      action: { type: 'click' },
    },
    {
      wait: {
        path: [
          {
            css: '#__CONNECTKIT__ div button img[alt^=Rabby]',
          },
        ],
      },
      action: { type: 'click' },
    },
    {
      wait: {
        path: [{ css: 'a[href^=\\#\\/dashboard]' }],
      },
      action: { type: 'click' },
    },
  ],
  'https://www.asterdex.com': [
    {
      beforeMs: 1000,
      wait: {
        path: [
          {
            css: '#app header button span.contents',
          },
          { closest: 'button' },
          { enabled: true },
        ],
      },
      action: { type: 'click' },
    },
    {
      beforeMs: 1000,
      wait: {
        path: [
          {
            css: '#app header button span.contents',
          },
          { closest: 'button' },
          { enabled: true },
        ],
      },
      action: { type: 'click' },
    },
    {
      wait: {
        path: [
          {
            css: 'div[role=dialog]>div>div>button.button',
          },
        ],
      },
      action: { type: 'click' },
    },
  ],
  'https://app.lighter.xyz': [
    {
      wait: {
        path: [
          {
            css: 'button[data-testid=connect-wallet-button]',
          },
        ],
      },
      action: { type: 'click' },
    },
    {
      wait: {
        path: [
          {
            css: '#dynamic-modal > div:nth-child(1)',
          },
          { shadow: true },
          {
            css: 'div.modal-component__container div button img[alt^=rabby]',
          },
          { enabled: true },
        ],
      },
      action: { type: 'click' },
    },
    {
      wait: {
        path: [
          {
            css: 'button[data-testid=connect-wallet-modal-submit-request]',
          },
        ],
      },
      action: { type: 'click' },
    },
  ],
  'https://app.opinion.trade': [
    {
      wait: {
        path: [
          {
            css: 'a[href="/login"]',
          },
        ],
      },
      action: { type: 'wait', ms: 2000 },
    },
    {
      wait: {
        path: [
          {
            css: 'a[href="/login"]',
          },
        ],
      },
      action: { type: 'click' },
    },
    {
      wait: {
        path: [
          {
            css: '[alt="Rabby Wallet"][src^=data\\:image\\/svg]',
          },
          { enabled: true },
        ],
      },
      action: { type: 'click' },
    },
  ],
  'https://probable.markets': [
    {
      wait: {
        path: [
          {
            css: 'body header button + div button[data-variant="primary"]',
          },
        ],
      },
      action: { type: 'click' },
    },
    {
      wait: {
        path: [
          {
            css: 'img[src*=wallets\\/rabby]',
          },
        ],
      },
      action: { type: 'click' },
    },
  ],
};
