import { EVENTS } from '@/constant';
import eventBus from '@/eventBus';
import { keccak256, toUtf8Bytes } from 'ethers/lib/utils';

export type SigningOperation = Readonly<{
  id: string;
  origin: string;
  accountAddress: string;
  accountType: string;
  payloadHash: string;
}>;

export const createSigningOperation = ({
  id,
  origin,
  account,
  method,
  params,
}: {
  id: string;
  origin?: string;
  account: { address: string; type: string };
  method: string;
  params: unknown;
}): SigningOperation => {
  if (!id) throw new Error('A signing operation ID is required');
  return Object.freeze({
    id,
    origin: origin || '',
    accountAddress: account.address.toLowerCase(),
    accountType: account.type,
    payloadHash: keccak256(
      toUtf8Bytes(JSON.stringify({ method, params: params ?? null }))
    ),
  });
};

export const isSameSigningOperation = (
  actual: SigningOperation | undefined,
  expected: SigningOperation | undefined
) =>
  !!actual &&
  !!expected &&
  typeof actual.id === 'string' &&
  typeof actual.origin === 'string' &&
  typeof actual.accountAddress === 'string' &&
  typeof actual.accountType === 'string' &&
  typeof actual.payloadHash === 'string' &&
  actual.id === expected.id &&
  actual.origin === expected.origin &&
  actual.accountAddress.toLowerCase() ===
    expected.accountAddress.toLowerCase() &&
  actual.accountType === expected.accountType &&
  actual.payloadHash === expected.payloadHash;

export const isSignFinishedFor = (
  data: any,
  expected: SigningOperation | undefined
) => isSameSigningOperation(data?.signingOperation, expected);

export const waitSignComponentAmounted = async () => {
  return new Promise<void>((r) =>
    eventBus.once(EVENTS.SIGN_WAITING_AMOUNTED, () => {
      r();
    })
  );
};

// only work in UI
export const emitSignComponentAmounted = () => {
  // to background
  eventBus.emit(EVENTS.broadcastToBackground, {
    method: EVENTS.SIGN_WAITING_AMOUNTED,
  });
  // to ui
  eventBus.emit(EVENTS.SIGN_WAITING_AMOUNTED);
};
