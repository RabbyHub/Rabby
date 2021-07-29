# Rabby [![CircleCI](https://circleci.com/gh/RabbyHub/Rabby/tree/master.svg?style=svg)](https://circleci.com/gh/RabbyHub/Rabby/tree/master) [![DavidDM](https://img.shields.io/david/RabbyHub/rabby)](https://david-dm.org/RabbyHub/rabby)

Rabby is an open source browser plugin for the DeFi ecosystem, providing users with a better-to-use and more secure multi-chain experience.

## Install

You can Download the latest Rabby [here](https://github.com/RabbyHub/Rabby/releases/latest).

## Contribution

### Install dependency

1. Install Node.js version 14 or later
2. Install Yarn `npm install -g yarn`
3. Run `yarn` to install dependency

### Development

Run `yarn build:dev` to develop with file watching and development log(you can see request sent by dapp in website console in this mode and notification will not close when focus lost)

Run `yarn build:pro` to build a production package, it's in dist folder

### Language

1. Copy `_raw/_locales/en/messages.json` to `_raw/_locales/${localCode}/messages.json` (Find your locale code in [https://en.wikipedia.org/wiki/Language_localisation#Language_tags_and_codes](https://en.wikipedia.org/wiki/Language_localisation#Language_tags_and_codes))
2. Replace content in `message` property to your locale language

ATTENTION: When you create a new key, make sure the key should without space and not duplicate with exist(case insensitive)

## Architecture

![architecture](./docs/architecture.png)

## Extension's scripts

below 4 scripts all live in different context!

### **- `background.js`**

for all async request and encrypt things.

user's keyrings, password and wallet personal preference data all stored in chrome local storage.

it has 2 main controllers:

1. `walletController`

   it expose methods to background window, so other scripts can access these methods with `runtime.getBackgroundPage`, e.g. `ui.js`.

2. `providerController`

   it handles request from pages(dapp request).

### **- `content-script`**

injected at `document_start`, share the same dom with dapp, use `broadcastChannel` to tap `pageProvider`.

the main purpose is inject `pageProvider.js` and pass messages between `pageProvider.js` and `background.js`.

### **- `pageProvider.js`**

this script is injected into dapp's context through `content-script`. it mounts `ethereum` to `window`.

when dapp use `window.ethereum` to request, it will send message to `content-script` with `broadcastChannel` and wait for it's response.

then the `content-script` will send message to `background` with `runtime.connect`.

after `background` receive the message, it will use `providerController` to handle the request. and keep the message channel in `sessionSevice` for later communicate.

### **- `ui`**

it's used by 3 pages which share the same js code, but the template html is different for respective purpose.

1. `notification.html`

   triggered by dapp to request user's permission.

2. `index.html`

   opened in browser tab for better user interaction experience.

3. `popup.html`

   user click the extension icon on the right of address bar, the popup will show.

## Thanks

Thanks for contributions from MetaMask team to browser extension wallet community, Rabby use (or fork) them to make Rabby better.