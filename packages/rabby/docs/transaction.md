# Transaction

Rabby **absolutly respect and use tx params set by DApp, but somtimes DApp will not set some params**, this doc will told you when and how Rabby change these params.

## gas

gas means gas limit for this transaction, if DApp not set it, we will set it an empty string (`''`) for explain (not execute actually, just for explain how this tx execute), after explain, API will told us gas limit of this transaction (`1.5  * result of web3.eth_estimateGas()` currently).

## gasPrice

gasPrice means how much you will pay for each step of this transaction, if DApp not set it, we will ask API for GasMarket(which will response a list of gas and estimate time) first, then use the fastest one as default, user can change it in confirm page.

## value

Sometimes DApp not set value param(like [https://pancakeswap.finance/farms](https://pancakeswap.finance/farms), when you enable a Stake LP, value is not set), we will set `0x0` as default.

## data

When transaction is not a contract(like send token to another address), DApp will not set data param, we use `0x` as default.