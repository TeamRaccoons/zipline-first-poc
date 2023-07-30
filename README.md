# Zipline

Zipline is a Solana smart wallet controlled by an ethereum wallet.

This repo contains the Zipline dApp and the Zipline program

Goals:

- Seemlessly integrate with any dApp
- Allow basic management of the smart wallet: View tokens, transfer...

> :warning: **Incomplete, unaudited**

The smart wallet allows cross program invocation of arbitrary instruction as long as the message was signed by the ETH address owning the smart wallet, this is verified using the secp256k1 program.

The secp256k1 program docs https://docs.solana.com/developing/runtime-facilities/programs#secp256k1-program

Other examples using the secp256k1 program
https://github.com/wormhole-foundation/wormhole/blob/5255e933d68629f0643207b0f9d3fa797af5cbf7/solana/bridge/program/src/api/verify_signature.rs#L99

## Issues

- Uses nightly connect as walletconnect design is broken and wouldn't allow such a smooth result, but nightly connect isn't available everywhere...
- The smart wallet isn't in any way efficient, it is currently written for simplicity
- No relayer incentive, introducing a safe incentive might involve a less smooth process

## Potential improvements

- Clever compression of input while fully validating as
  https://github.com/Squads-Protocol/v4/blob/370209c299693eb0027e015456807b1f5cc2d4df/programs/multisig/src/state/vault_transaction.rs#L57
