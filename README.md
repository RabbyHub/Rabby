# RabbyWallet

## architecture

![architecture](./docs/architecture.png)

## extension's scripts!!

all 4 scripts all run in different context!!

- `background.js`

  for all async request and encrypt things, use chrome.runtime.connect to tap content-script.

  user's keyrings, password and wallet personal preference data all stored in chrome local storage.

  it has 2 main controllers:

  - `walletController`

    it expose methods to background window, so other scripts can access these methods with `runtime.getBackgroundPage`, like `ui`

  - `providerController`

    it handles request from pages(dapp request)

- `content-script`

  injected at document_start, lives in an isolated worlds, but share the same dom, use broadcastChannel to tap `pageProvider`.

- `pageProvider.js`

  this script is injected into webpage's context through content-script. it mount `ethereum` object to `window`.

  when dapp use `window.ethereum` to request, it will send message to `content-script` with `broadcastChannel` and wait for it response.

  then `content-script` will send message to `background` with `chrome.runtime.connect`.

  after `background` receive the message, it will use `providerController` to handle the request. and keep the channel in `sessionSevice` for later `push event`.

- `ui`

  it contains 3 pages, all share the same code, but the template html is different for respective purpose.

  - `notification.html`

    triggered by dapp to request user's permission

  - `index.html`

    opened in tab for better user interaction experience

  - `popup.html`

    user click the extension icon on the right of address bar, the popup will show.
