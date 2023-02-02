# background

## architecture

there are 2 controllers that handle the requests.

- `walletController` is mounted to background's window, `ui` will get it with `runtime.getBackgroundWindow`.

- `providerController` is listening messages from `runtime.onConnect` and handle these requests.

controller can make use of every `service` which implements specific logic.

## keyring storage

we fork metamask's keyring package to store user's private key, mnemonics.

they will be encrypted with `aes`, and stored in chrome local storage.

the other data like `preference`, `chain`... will be stored directly in the local storage.

## Provider Handle Flow

when message received from `runtime.onConnect`, it will be sent to _rpcFlow.ts_.

it will pass through multi-middlewares to check the wallet status, if it needs to `set approval`, at last it will be sent to the `providerController`.


## session

in the `runtime.onConnect`, we will store the port and dapp's icon, name... as session.

if we need to send message to dapp, we just use `port.sendMessage`.
