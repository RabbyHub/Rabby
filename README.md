<div align="center">
  <a href="https://rabby.io">
    <img src="https://github.com/RabbyHub/Rabby/blob/develop/src/ui/assets/logo.svg" alt="Rabby Wallet Logo" width="300">
  </a>
</div>

# 🔐 Rabby Wallet

**Rabby Wallet** is an open-source **browser extension** designed for the **DeFi ecosystem**, offering users a **better and more secure** multi-chain experience.

<div align="center">

[![GitHub Repo stars](https://img.shields.io/github/stars/RabbyHub/Rabby?logo=github&color=yellow)](https://github.com/RabbyHub/Rabby/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/RabbyHub/Rabby?logo=github&color=blue)](https://github.com/RabbyHub/Rabby/network/members)
[![GitHub last commit](https://img.shields.io/github/last-commit/RabbyHub/Rabby?logo=git)](https://github.com/RabbyHub/Rabby/commits/main)
[![Discord](https://img.shields.io/discord/924442927399313448?logo=discord&color=5865F2)](https://discord.com/invite/seFBCWmUre)
[![Twitter Follow](https://img.shields.io/twitter/follow/rabby_io?style=flat&logo=twitter)](https://x.com/rabby_io)

</div>

---

## 🚀 **Install Rabby Wallet**
You can download the latest version of Rabby Wallet here:  
➡️ **[Download Rabby Wallet](https://github.com/RabbyHub/Rabby/releases/latest)**

---

## 🛠 **Integration Guide for Dapp Developers**

We provide an easy integration solution for **dapp developers** with **almost no development cost** and **no added uncertainty**.

### ⚠️ **The Problem**
When a dapp connects to a browser wallet, it follows these steps:
1. The extension injects an `"Ethereum"` object into the dapp page.
2. The dapp detects this `"Ethereum"` object to confirm a wallet is installed.
3. The dapp uses this object for interactions with the extension wallet.
4. If the `"Ethereum"` object is not found, the dapp prompts users to install a wallet.

However, **many dapps incorrectly assume the `"Ethereum"` object belongs to MetaMask** and display a **"Connect to MetaMask"** button, leading to **user confusion**. Any Web3 wallet can inject this object, not just MetaMask.

### ✅ **The Solution**
We recommend the following **UI changes** to solve this issue:

1. **Display both "Connect to MetaMask" and "Connect to Rabby Wallet" buttons** when detecting the `"Ethereum"` object.  
   - Both buttons **function the same way** but help users recognize **which wallet they are using**.  
2. **If no `"Ethereum"` object is found**, prompt users to **download** both MetaMask and Rabby Wallet.  

This **simple UI adjustment** requires **no changes to business logic**, is **cost-effective**, and prevents confusion.  

For reference, see **[debank.com](https://debank.com)**.

### 🔹 **Potential Issues**
- If a **Rabby Wallet user clicks "Connect to MetaMask"**, it will still connect to Rabby.  
- This scenario is **rare** since users typically connect with the wallet they installed.  
- Even if it happens, **it does not affect user experience**.

If you have any doubts, feel free to **reach out to us**!

---

## 🛠 **Contribution Guide**

### 📦 **Install Dependencies**
1. Install **Node.js v14+**  
2. Install **Yarn**:  
   📌 `npm install -g yarn`  
3. Install dependencies:  
   📌 `yarn`

### 🔧 **Development**
- Start development mode:  
  📌 `yarn build:dev`  
  _(Enables file watching, logs requests in the console, and prevents notifications from closing)_  

- Build for production:  
  📌 `yarn build:pro`  
  _(Outputs files to the `dist` folder)_  

---

## ⚙️ **Architecture**

![architecture](./docs/architecture.png)

## 🔍 **Extension Scripts Overview**

The **Rabby Wallet extension** consists of **four main scripts**, each running in a **different context**.

### 🛠 **`background.js`**  
Handles **async requests, encryption tasks, and user data storage** in Chrome local storage.  
It has **two key controllers**:  
1. **`walletController`** – Exposes methods to `background.js`, allowing other scripts (like `ui.js`) to access wallet functions.  
2. **`providerController`** – Handles dapp **requests to the Ethereum provider**.

### 🌍 **`content-script.js`**  
- Injected **at `document_start`**, sharing the **same DOM** as the dapp.  
- Uses `broadcastChannel` to **communicate with `pageProvider.js`**.  
- Injects `pageProvider.js` to pass messages between dapps and the background script.

### 🔗 **`pageProvider.js`**  
- Injected into the dapp's **context** via `content-script`.  
- Mounts `window.ethereum`, allowing the dapp to interact with Rabby.  
- Forwards requests between `content-script` and `background.js` via `broadcastChannel` and `runtime.connect`.

### 🖥 **UI Scripts**  
- **`notification.html`** – Prompts users for **wallet permissions**.  
- **`index.html`** – A full-page **UI for a better experience**.  
- **`popup.html`** – The **mini-popup UI** shown when clicking the extension icon.

---

## 🎉 **Acknowledgments**
Special thanks to the **MetaMask team** for their contributions to the browser extension wallet ecosystem.  
Rabby Wallet **leverages and improves upon** their work.

---

## 💬 **Join the Community**
<p align="left">
  <a href="https://discord.com/invite/seFBCWmUre">
    <img src="https://img.shields.io/badge/Discord-5865F2?logo=discord&logoColor=white&style=for-the-badge" alt="Discord">
  </a>
  <a href="https://x.com/rabby_io">
    <img src="https://img.shields.io/badge/Twitter-000000?logo=x&logoColor=white&style=for-the-badge" alt="Twitter (X)">
  </a>
</p>

