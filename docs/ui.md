# UI

This extension has 3 kinds of UI pages.

- `browser action popup page`

  When the user clicks the icon beside the browser address bar, this page will show up.

- `notification page`

  When a Dapp requests user interaction, such as `sign` or `connect`, this page will show in a separate window.

- `tab page`

  When the extension needs more space to ensure the user can get information easily, it will open a browser tab to display content.

These pages share the same code. At the start of `ui` display, the extension will try to execute `getBackgroundWindow` first.

All operations regarding the wallet are mounted in the `background window.wallet`.

## Route

The default route of `ui` is `SortHat`(_SortHat.tsx_). This will check the wallet status, and decide which view to display.

## Approval

When a Dapp requests something which needs the user's permission, the `approval job` will be set, and this triggers the `notification page` open.

Then the page will check the `approval job` status in the `SortHat` view, and navigate to the `Approval` view.(_views/Approval_)

Depending on the `approval job` uiType, a different `Approval` component will be displayed.

