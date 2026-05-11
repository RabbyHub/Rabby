import type { StepConfig } from '@/content-script/auto-click-runner';

export const rules: Record<string, StepConfig[]> = {
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
};
