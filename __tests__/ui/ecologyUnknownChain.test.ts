import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter, Route, Switch } from 'react-router-dom';
import { Ecology } from '@/ui/views/Ecology';

// `/ecology/:chainId` takes the id from the URL. An id missing from
// EcoChainMap (for example the removed Sonic Testnet, 64165) used to make the
// page throw on `chain.navBarClassName`.
jest.mock('@/ui/views/Ecology/constants', () => {
  const { createElement: h } = jest.requireActual('react');
  const DbkEntry = () => h('div', { 'data-testid': 'dbk-entry' });
  const EcoChainMap = {
    20240603: { name: 'DBK Chain', navBarClassName: 'nav', entry: DbkEntry },
  };
  return {
    EcoChainMap,
    EcoChains: Object.keys(EcoChainMap).map((key) => ({
      id: Number(key),
      ...EcoChainMap[key],
    })),
  };
});
jest.mock('@/ui/component/Ecology/EcologyNavBar', () => {
  const { createElement: h } = jest.requireActual('react');
  return {
    EcologyNavBar: ({ chainId }: { chainId: number }) =>
      h('div', { 'data-testid': 'nav', 'data-chain': chainId }),
  };
});

describe('Ecology route', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const renderAt = (path: string) =>
    act(() => {
      root.render(
        createElement(
          MemoryRouter,
          { initialEntries: [path] },
          createElement(
            Switch,
            null,
            createElement(
              Route,
              { path: '/ecology/:chainId' },
              createElement(Ecology)
            ),
            createElement(
              Route,
              { path: '/', exact: true },
              createElement('div', { 'data-testid': 'home' })
            )
          )
        )
      );
    });

  const has = (id: string) =>
    container.querySelector(`[data-testid="${id}"]`) !== null;

  test('renders the entry for a listed chain', () => {
    renderAt('/ecology/20240603');
    expect(has('dbk-entry')).toBe(true);
    expect(
      container.querySelector('[data-testid="nav"]')?.getAttribute('data-chain')
    ).toBe('20240603');
  });

  test.each(['64165', 'constructor', 'abc'])(
    'redirects to / for unlisted id %s instead of throwing',
    (id) => {
      expect(() => renderAt(`/ecology/${id}`)).not.toThrow();
      expect(has('home')).toBe(true);
      expect(has('nav')).toBe(false);
    }
  );
});
