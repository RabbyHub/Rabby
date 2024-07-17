# Rabby Wallet

Rabby Wallet is an open-source browser plugin for the DeFi ecosystem, providing users with a better-to-use and more secure multi-chain experience.

## Install

You can download the latest Rabby [here](https://github.com/RabbyHub/Rabby/releases/latest).

## Guideline for Integrating Rabby Wallet

To help dapp developers support and integrate Rabby Wallet more easily, we recommend using our integration solution that has almost NO development cost and does not introduce any uncertainty:

### Problem

When a dapp connects to an extension wallet, it usually works in this way:

1. The extension wallet will integrate an "Ethereum" object into the dapp page while it's loading.
2. The dapp will look for this "Ethereum" object to determine if an extension wallet is installed.
3. If the "Ethereum" object is detected, all following interactions between the dapp and the extension wallet are realized by this "Ethereum" object.
4. If the "Ethereum" object is not detected, the dapp will ask users to download a new extension wallet.

The problem is that many dapps will wrongly display this detected "Ethereum" object as "MetaMask" and display a "connect to MetaMask" button by default, which brings a lot of confusion to the users since any Web3 wallet can inject this "Ethereum" object.

### Solution

We recommend solving the above problem with simple modifications as follows:

1. On your connection page, display both connection buttons for "MetaMask" and "Rabby Wallet" when the "Ethereum" object is detected.
 1.1 These two buttons basically have the same function. Users can click either of them to interact with the "Ethereum" object and perform the connection operation.
 1.2 These two buttons are only used to display both brands' logos to help users understand their operation path.
2. If the "Ethereum" object is not detected, then suggest that users download the extension wallet and provide download links for both "MetaMask" and "Rabby Wallet."

This solution does not involve any changes to your actual business logic and is just simple UI adjustments. It does not introduce any uncertainty and is rather low cost.

You can refer to [debank.com](https://debank.com) for the final display effect.

### Potential Issues

According to the above solution, if a user is using the "Rabby Wallet" and clicks the "connect to MetaMask" button, they will still interact with the "Rabby Wallet" and vice versa, which might be a bit weird.

However, this issue is a very rare scenario and very unlikely to happen because users are not likely to click and interact with an extension wallet they haven't installed. Even if it happens, it's not a real problem from the user's perspective.

Please don't hesitate to reach out if you have any doubts.

## Contribution

### Install Dependency

1. Install Node.js version 14 or later.
2. Install Yarn: `npm install -g yarn`
3. Run `yarn` to install dependencies.

### Development

Run `yarn build:dev` to develop with file watching and development logging (you can see requests sent by the dapp in the website console in this mode, and notifications will not close when focus is lost).

Run `yarn build:pro` to build a production package, which will be in the `dist` folder.

## Architecture

![architecture](./docs/architecture.png)

## Extension's Scripts

Below 4 scripts all live in different contexts!

### `background.js`

Handles all async requests and encryption tasks.

User's keyrings, passwords, and wallet personal preference data are all stored in Chrome local storage.

It has 2 main controllers:

1. `walletController`

   Exposes methods to the background window, so other scripts can access these methods with `runtime.getBackgroundPage`, e.g., `ui.js`.

2. `providerController`

   Handles requests from pages (dapp requests).

### `content-script`

Injected at `document_start`, shares the same DOM with the dapp, and uses `broadcastChannel` to tap `pageProvider`.

The main purpose is to inject `pageProvider.js` and pass messages between `pageProvider.js` and `background.js`.

### `pageProvider.js`

This script is injected into the dapp's context through `content-script`. It mounts `ethereum` to `window`.

When the dapp uses `window.ethereum` to request, it will send a message to `content-script` with `broadcastChannel` and wait for its response.

Then the `content-script` will send a message to `background` with `runtime.connect`.

After `background` receives the message, it will use `providerController` to handle the request and keep the message channel in `sessionService` for later communication.

### `ui`

Used by 3 pages which share the same JS code, but the HTML template is different for each respective purpose.

1. `notification.html`

   Triggered by the dapp to request the user's permission.

2. `index.html`

   Opened in a browser tab for a better user interaction experience.

3. `popup.html`

   Shown when the user clicks the extension icon to the right of the address bar.

## Thanks

Thanks to contributions from the MetaMask team to the browser extension wallet community, Rabby uses (or forks) them to make Rabby better.

## Other Docs

- [How to add a new translation to Rabby](/docs/translation.md)
