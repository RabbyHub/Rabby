import KeystoneKeyring, {
  AcquireMemeStoreData,
  MemStoreDataReady,
} from '@/background/service/keyring/eth-keystone-keyring';

const request = (requestId: string) => ({
  requestId,
  payload: { type: 'eth-sign-request', cbor: 'aa' },
});

describe('Keystone sign request delivery', () => {
  it('pushes a request created after the waiting page asked, once', () => {
    const keyring = new KeystoneKeyring();
    // A second instance shares the interaction singleton; it must not double-wire.
    new KeystoneKeyring();
    const interaction = keyring.getInteraction();
    const store = keyring.getMemStore();
    const seen: string[] = [];
    const onReady = (r) => seen.push(r.requestId);
    interaction.on(MemStoreDataReady, onReady);

    try {
      // Page mounts and asks before signing has produced a request.
      interaction.emit(AcquireMemeStoreData);
      expect(seen).toEqual([]);

      store.updateState({ sign: { request: request('a') } });
      // Unrelated store updates must not re-push the same request.
      store.updateState({ sync: { reading: false } });
      expect(seen).toEqual(['a']);

      // A page that mounts after the request exists still pulls it.
      interaction.emit(AcquireMemeStoreData);
      expect(seen).toEqual(['a', 'a']);

      store.updateState({ sign: {} });
      store.updateState({ sign: { request: request('b') } });
      expect(seen).toEqual(['a', 'a', 'b']);
    } finally {
      interaction.off(MemStoreDataReady, onReady);
      store.updateState({ sign: {} });
    }
  });
});
