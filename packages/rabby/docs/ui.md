# UI

this extension has 3 kinds of ui page.

- `browser action popup page`

  when user click the icon besides browser address bar, this page will show up.

- `notification page`

  when dapp request user interaction. some like `sign`, `connect`, this page will show in a seperate window.

- `tab page`

  when the extension needs more space to ensure user can get information easily, it will open a browser tab to disaply content.

these pages share the same code. in the start of `ui` show, the extension will try to execute `getBackgroundWindow` first.

all operations about wallet are mounted in the `background window.wallet`.

## Route

the default route of `ui` is `SortHat`(_SortHat.tsx_), it will check the wallet status, and decide which view to display.

## Approval

when dapp request something which needs user's permission, the `approval job` will be seted, and trigger the `notification page` open.

then page will check the `approval job` status in the `SortHat` view, and navigate to the `Approval` view.(_views/Approval_)

according to the `approval job` uiType, it will display different `Approval` component.

