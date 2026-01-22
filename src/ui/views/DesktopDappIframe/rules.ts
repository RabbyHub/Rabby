export const rules = {
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
          { css: '#authentication-modal' },
          { within: true },
          {
            attr: {
              selector: 'svg path',
              name: 'fill',
              value: 'url(#paint0_linear_60607_36577)',
              mode: 'equals',
            },
          },
          { closest: 'button' },
          { enabled: true },
        ],
      },
      action: { type: 'click' },
    },
  ],
};
