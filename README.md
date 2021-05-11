# Rabby

> [provider api](https://eips.ethereum.org/EIPS/eip-1193)
## extension's scripts!!
all 4 scripts all run in different context!!

- `background.js`

  for all async request and encrypt things, use postmessage to tap content-script
- `content-script`

  injected at document_start, lives in an isolated worlds, but share the same dom, so use dom event to communicate.

  **`inject.js`**: this script is injected into webpage's context through content-script

- `popup`

  it can get background window with `runtime.getBackgroundPage`, so use it directly

  **`notification.html`** triggered by dapp to request user's permission
  **`index.html`** opened in tab for better user interaction experience

### 0). bundle the whole app with `webpack`
### 1). use `react` to manage `ui`

