# Content-script

this script is intended to inject the `ethereum provider` into dapp's page.

Although `content-script` share the same dom with `dapp`, but the context is different.

`content-script` will inject the `provider` with a inline script element at `document_start`.

`content-script` also generate a random value as the `broadcastChannel`(_broadcastChannelMessage.ts_) name, to establish channel between `content-script` and `ethereum provider`.

## message pass

### from dapp

when dapp use the provider function, like `ethereum.request`, the `provider` will send a message to `content-script` with `broadcastChannel`.

### to background

the `content-script` will connect `background` in the start through `runtime.connect()`.(_portMessage.ts_)

after `content-script` receive the message from dapp, it will send the message to background, using the `runtime channel`.

in a nutshell, the extension can only handle **one** request at the same time for each page. before the request solved, other requests are queued to send.

## request queue

the request will be queued in the `provider` when dapp page's `visibility === hidden`.
