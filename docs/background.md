# Background

## Architecture

There are 2 controllers handle the requests.

- `walletController` is mounted to background's window, `ui` will get it with `runtime.getBackgroundWindow`.

- `providerController` is listening message from `runtime.onConnect` and handle these request.

Controller can make use of every `service` which implements specific logic.

## Keyring storage

We fork metamask's keyring package to store user's private key, mnemonics.

They will be encrypt with `aes`, and store in chrome local storage.

The other data like `preference`, `chain`... will store directly in the local storage.

## Provider Handle Flow

When message received from `runtime.onConnect`, it will be send to _rpcFlow.ts_.

It will pass through multi-middlewares to check the wallet status, if it's need to `set approval`, at last it will sended to the `providerController`.


## Session

In the `runtime.onConnect`, we will store session information, including the port, dapp's icon and name, etc.

If we need send message to dapp, just use `port.sendMessage`.
