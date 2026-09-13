import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

import { createSelectorStore } from '@/ui/state/createStore/createSelectorStore';

const reactActEnvironment = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

describe('selector-compatible store', () => {
  beforeAll(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterAll(() => {
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  test('supports selectors that return a fresh object without a render loop', () => {
    const useStore = createSelectorStore<{ count: number }>()(() => ({
      count: 0,
    }));
    const container = document.createElement('div');
    const root = createRoot(container);
    let renderCount = 0;

    const Consumer = () => {
      useStore((state) => ({ count: state.count }));
      renderCount += 1;
      return null;
    };

    act(() => {
      root.render(React.createElement(Consumer));
    });
    expect(renderCount).toBe(1);

    act(() => {
      useStore.setState({ count: 1 });
    });
    expect(renderCount).toBe(2);

    act(() => {
      root.unmount();
    });
  });
});
