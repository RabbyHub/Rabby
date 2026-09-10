import {
  createSigningSessionGuard,
  invalidateSigningSession,
  isBroadcastTransactionHash,
} from '@/background/service/signingSession';
import { KEYRING_CLASS, KEYRING_TYPE } from '@/constant';
import { execFileSync } from 'child_process';
import { resolve } from 'path';

it('runs the actual signing and broadcast paths across cancellation, ABA, RPC fallback and remote-wallet hashes', () => {
  const output = execFileSync(
    process.execPath,
    ['__tests__/fixtures/signingSessionRepro.cjs'],
    {
      cwd: resolve(__dirname, '../..'),
      encoding: 'utf8',
    }
  );
  expect(output.trim().split('\n')).toHaveLength(26);
});

it('never treats a hardware signature or an unvalidated string as a broadcast hash', () => {
  const hash = `0x${'11'.repeat(32)}`;
  expect(
    isBroadcastTransactionHash(KEYRING_TYPE.WalletConnectKeyring, hash)
  ).toBe(true);
  expect(isBroadcastTransactionHash(KEYRING_TYPE.CoinbaseKeyring, hash)).toBe(
    true
  );
  for (const type of [
    KEYRING_CLASS.HARDWARE.LEDGER,
    KEYRING_CLASS.HARDWARE.ONEKEY,
    KEYRING_TYPE.SimpleKeyring,
  ]) {
    expect(isBroadcastTransactionHash(type, hash)).toBe(false);
    expect(
      isBroadcastTransactionHash(type, { r: '0x1', s: '0x2', v: '0x1b' })
    ).toBe(false);
  }
  expect(
    isBroadcastTransactionHash(KEYRING_TYPE.WalletConnectKeyring, '0xhash')
  ).toBe(false);
  expect(
    isBroadcastTransactionHash(
      KEYRING_TYPE.CoinbaseKeyring,
      `0x${'11'.repeat(65)}`
    )
  ).toBe(false);
});

it('restoring the unlocked state does not revive a prior session', () => {
  let unlocked = true;
  const old = createSigningSessionGuard(() => unlocked);
  unlocked = false;
  invalidateSigningSession();
  unlocked = true;
  expect(old).toThrow('Signing request is no longer active');
  expect(createSigningSessionGuard(() => unlocked)).not.toThrow();
});

it('cancelling one approval execution leaves other executions active', () => {
  const cancelled = new AbortController();
  const first = createSigningSessionGuard(() => true, cancelled.signal);
  const second = createSigningSessionGuard(
    () => true,
    new AbortController().signal
  );
  cancelled.abort();
  expect(first).toThrow('Signing request is no longer active');
  expect(second).not.toThrow();
});
