import type {
  ContactBookItem,
  ContactBookStore,
} from '@/background/service/contactBook';
import eventBus from '@/eventBus';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createContactBookStore,
  selectAllAddrs,
  selectAllAliasAddrs,
  selectAllContacts,
  selectAliasByAddress,
  useContactAlias,
  useContactBookStore,
} from '@/ui/state/contactBook';
import { wallet } from '@/ui/wallet';
import { BROADCAST_TO_UI_EVENTS } from '@/utils/broadcastToUI';

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getStorageSnapshot: jest.fn().mockResolvedValue({
      origin: 'background-default',
      revision: 0,
      state: {},
    }),
    setStorageItem: jest.fn(),
  },
  onWalletReconnect: jest.fn(() => () => undefined),
}));

const contact = (
  partial: Partial<ContactBookItem> & Pick<ContactBookItem, 'address'>
): ContactBookItem => ({
  name: 'Contact',
  isAlias: false,
  isContact: false,
  ...partial,
});

const overWire = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const createHydratedStore = async (
  state: ContactBookStore,
  origin = 'background-1',
  revision = 0
) => {
  (wallet.getStorageSnapshot as jest.Mock).mockResolvedValueOnce({
    origin,
    revision,
    state,
  });
  const store = createContactBookStore({ autoHydrate: false });
  await store.persist.hydrate();
  return store;
};

const reactActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('contact book store', () => {
  beforeAll(async () => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    await useContactBookStore.persist.hydrationPromise();
    useContactBookStore.persist.destroy();
  });

  afterAll(() => {
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('hydrates automatically by default', async () => {
    const alice = contact({ address: '0xabc', name: 'Alice' });
    (wallet.getStorageSnapshot as jest.Mock).mockResolvedValueOnce({
      origin: 'background-1',
      revision: 0,
      state: { '0xabc': alice },
    });

    const store = createContactBookStore();

    expect(wallet.getStorageSnapshot).toHaveBeenCalledWith('contactBook');
    await store.persist.hydrationPromise();
    expect(store.getState()).toEqual({ '0xabc': alice });
    store.persist.destroy();
  });

  test('hydrates the service record without a UI wrapper', async () => {
    const alice = contact({
      address: '0xAbC',
      name: 'Alice',
      isAlias: true,
      isContact: true,
    });
    const store = await createHydratedStore({
      '0xabc': alice,
      '0xempty': undefined,
    });

    expect(store.getState()['0xabc']).toEqual(alice);
    expect(store.getState()).not.toHaveProperty('contactsByAddr');
    expect(selectAllAddrs(store.getState())).toEqual([
      { ...alice, address: '0xabc' },
    ]);
    store.persist.destroy();
  });

  test('applies background updates without writing them back', async () => {
    const store = await createHydratedStore({});
    const alice = contact({ address: '0xabc', name: 'Alice', isAlias: true });

    eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
      bgStoreName: 'contactBook',
      changedKey: '0xabc',
      changedKeys: ['0xabc'],
      partials: { '0xabc': alice },
      origin: 'background-1',
      revision: 1,
    });

    expect(store.getState()['0xabc']).toEqual(alice);
    expect(wallet.setStorageItem).not.toHaveBeenCalled();
    store.persist.destroy();
  });

  test('restores a deleted address stripped by JSON serialization', async () => {
    const store = await createHydratedStore({
      '0xabc': contact({ address: '0xabc', isAlias: true }),
    });

    eventBus.emit(
      BROADCAST_TO_UI_EVENTS.storeChanged,
      overWire({
        bgStoreName: 'contactBook',
        changedKey: '0xabc',
        changedKeys: ['0xabc'],
        partials: { '0xabc': undefined },
        origin: 'background-1',
        revision: 1,
      })
    );

    expect(Object.prototype.hasOwnProperty.call(store.getState(), '0xabc')).toBe(
      true
    );
    expect(store.getState()['0xabc']).toBeUndefined();
    store.persist.destroy();
  });

  test('replaces stale addresses after a background restart', async () => {
    const alice = contact({ address: '0xabc', name: 'Alice' });
    const bob = contact({ address: '0xdef', name: 'Bob' });
    (wallet.getStorageSnapshot as jest.Mock)
      .mockResolvedValueOnce({
        origin: 'background-1',
        revision: 5,
        state: { '0xabc': alice },
      })
      .mockResolvedValueOnce({
        origin: 'background-2',
        revision: 0,
        state: { '0xdef': bob },
      });
    const store = createContactBookStore({ autoHydrate: false });
    await store.persist.hydrate();

    eventBus.emit(BROADCAST_TO_UI_EVENTS.storeChanged, {
      bgStoreName: 'contactBook',
      changedKey: '0xdef',
      changedKeys: ['0xdef'],
      partials: { '0xdef': bob },
      origin: 'background-2',
      revision: 1,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getState()).toEqual({ '0xdef': bob });
    store.persist.destroy();
  });

  test('derives aliases and contacts from defined entries', async () => {
    const store = await createHydratedStore({
      '0xalias': contact({ address: '0xalias', isAlias: true }),
      '0xcontact': contact({ address: '0xcontact', isContact: true }),
      '0xboth': contact({
        address: '0xboth',
        isAlias: true,
        isContact: true,
      }),
      '0xempty': undefined,
    });
    const state = store.getState();

    expect(selectAllAddrs(state)).toHaveLength(3);
    expect(selectAllAliasAddrs(state).map((item) => item.address)).toEqual([
      '0xalias',
      '0xboth',
    ]);
    expect(selectAllContacts(state).map((item) => item.address)).toEqual([
      '0xcontact',
      '0xboth',
    ]);
    store.persist.destroy();
  });

  test('selects an alias by address without exposing non-alias contacts', () => {
    const state: ContactBookStore = {
      '0xabc': contact({
        address: '0xAbC',
        name: 'Alice',
        isAlias: true,
      }),
      '0xdef': contact({
        address: '0xDeF',
        name: 'Bob',
        isContact: true,
      }),
    };

    expect(selectAliasByAddress(state, '0xAbC')).toBe('Alice');
    expect(selectAliasByAddress(state, '0xDeF')).toBe('');
    expect(selectAliasByAddress(state, '0xMissing')).toBe('');
    expect(selectAliasByAddress(state)).toBe('');
  });

  test('reacts to alias changes for the selected address', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let selectedAlias = '';

    const Consumer = () => {
      selectedAlias = useContactAlias('0xReactive');
      return null;
    };

    act(() => {
      root.render(React.createElement(Consumer));
    });
    expect(selectedAlias).toBe('');

    act(() => {
      useContactBookStore.setState({
        '0xreactive': contact({
          address: '0xReactive',
          name: 'Reactive alias',
          isAlias: true,
        }),
      });
    });
    expect(selectedAlias).toBe('Reactive alias');

    act(() => {
      useContactBookStore.setState({
        '0xreactive': contact({
          address: '0xReactive',
          name: 'Contact only',
          isContact: true,
        }),
      });
    });
    expect(selectedAlias).toBe('');

    act(() => {
      root.unmount();
    });
  });
});
