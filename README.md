# Rabby Wallet

Rabby Wallet is an open-source browser plugin for the DeFi ecosystem, providing users with a better, more secure multi-chain experience.

## Install

You can download the latest version of Rabby [here](https://github.com/RabbyHub/Rabby/releases/latest).

## Guideline for Integrating Rabby Wallet

To help dApp developers support and integrate Rabby Wallet more easily, we recommend using our integration solution, which has almost NO development cost and introduces no uncertainty:

### Problem

When a dApp connects to an extension wallet, it usually works in this way:

1. The extension wallet integrates an "Ethereum" object into the dApp page while it's loading.
2. The dApp looks for this "Ethereum" object to determine if an extension wallet is installed.
3. If the "Ethereum" object is detected, all subsequent interactions between the dApp and the extension wallet are handled through this "Ethereum" object.
4. If the "Ethereum" object is not detected, the dApp asks users to download a new extension wallet.

The problem is that many dApps wrongly display this detected "Ethereum" object as "MetaMask" and show a "connect to MetaMask" button by default, which can confuse users since any Web3 wallet can inject this "Ethereum" object.

### Solution

We recommend solving the above problem with simple modifications as follows:

1. On your connection page, display both connection buttons for "MetaMask" and "Rabby Wallet" when the "Ethereum" object is detected. These two buttons perform the same function. Users can click either button to interact with the "Ethereum" object and perform the connection operation. These buttons are used solely to display both brands' logos, helping users understand their options.
2. If the "Ethereum" object is not detected, suggest that users download the extension wallet, providing download links for both "MetaMask" and "Rabby Wallet."

This solution does not require changes to your actual business logic and only involves simple UI adjustments. It introduces no uncertainty and has very low implementation cost.

You can refer to [debank.com](https://debank.com) for the final display effect.

### Potential Issues

According to the above solution, if a user is using the "Rabby Wallet" and clicks the "connect to MetaMask" button, they will still interact with the "Rabby Wallet" and vice versa, which might seem odd.

However, this issue is rare and unlikely because users are not likely to interact with an extension wallet they haven't installed. Even if it happens, it isn't a real problem from the user's perspective.

Please don't hesitate to reach out if you have any questions.

## Contribution

### Install Dependencies

1. Install Node.js version 14 or later.
2. Install Yarn: `npm install -g yarn`
3. Run `yarn` to install dependencies.

### Development

Run `yarn build:dev` to develop with file watching and development logging (you can see requests sent by the dApp in the website console in this mode, and notifications will not close when focus is lost).

Run `yarn build:pro` to build a production package, which will be located in the `dist` folder.

## Architecture

![architecture](./docs/architecture.png)

## Extension's Scripts

The following four scripts each run in different contexts:

### `background.js`

Handles all asynchronous requests and encryption tasks.

User keyrings, passwords, and wallet personal preference data are stored in Chrome local storage.

It has two main controllers:

1. `walletController`

   Exposes methods to the background window so other scripts can access these methods with `runtime.getBackgroundPage` (e.g., `ui.js`).

2. `providerController`

   Handles requests from pages (dApp requests).

### `content-script`

Injected at `document_start`, shares the same DOM as the dApp, and uses `broadcastChannel` to interact with `pageProvider`.

The main purpose is to inject `pageProvider.js` and pass messages between `pageProvider.js` and `background.js`.

### `pageProvider.js`

This script is injected into the dApp's context through the `content-script`. It mounts `ethereum` to the `window` object.

When the dApp uses `window.ethereum` to send a request, the request is sent to the `content-script` through `broadcastChannel` and waits for a response.

Then the `content-script` sends a message to the `background` via `runtime.connect`.

After the `background` receives the message, it uses `providerController` to handle the request, and keeps the message channel in `sessionService` for future communication.

### `ui`

Used by three pages that share the same JS code, but each HTML template differs based on its specific purpose:

1. `notification.html`

   Triggered by the dApp to request user permission.

2. `index.html`

   Opened in a browser tab to provide a better user interaction experience.

3. `popup.html`

   Shown when the user clicks the extension icon next to the address bar.

## Thanks

Thanks to contributions from the MetaMask team to the browser extension wallet community. Rabby uses (or forks) their contributions to improve Rabby.

## Other Docs

- [How to add a new translation to Rabby](/docs/translation.md)
