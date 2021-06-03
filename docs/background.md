# background

## architecture

there are 2 controllers handle the requests.

- `walletController` is mounted to background's window, `ui` will get it with `runtime.getBackgroundWindow`.

- `providerController` is listening message from `runtime.onConnect` and handle these request.

controller can make use of every `service` which implements specific logic.

## keyring storage

we fork metamask's keyring package to store user's private key, mnemonics.

they will be encrypt with `aes`, and store in chrome local storage.

the other data like `preference`, `chain`... will store directly in the local storage.

## Provider Handle Flow

when message received from `runtime.onConnect`, it will be send to _rpcFlow.ts_.

it will pass through multi-middlewares to check the wallet status, if it's need to `set approval`, at last it will sended to the `providerController`.


## session

in the `runtime.onConnect`, we will store the port and dapp's icon, name... as session.

if we need send message to dapp, just use `port.sendMessage`.
