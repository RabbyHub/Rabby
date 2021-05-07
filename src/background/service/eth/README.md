## eth service

use metamask eth-keyring-controller to manage keyrings;
- eth-trezor-keyring

  https://github.com/trezor/connect/blob/develop/src/js/plugins/webextension/README.md
- @metamask/eth-ledger-bridge-keyring

  it should use webhid [later](https://github.com/LedgerHQ/ledgerjs/blob/master/docs/migrate_webusb.md) instead of u2f which is [unreliable](https://github.com/MetaMask/metamask-extension/issues/8100) to connect hardware.

  the `https://metamask.github.io/eth-ledger-bridge-keyring/` in the package is just message transport between `background` and `ledger`, cause whatever transport method(u2f, webhid, webusb) all need hosted in https.
