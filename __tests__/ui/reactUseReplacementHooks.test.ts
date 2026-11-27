import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { usePreviousRender } from '@/ui/hooks/usePreviousRender';
import { useMedia } from '@/ui/hooks/useMedia';

describe('hooks replacing react-use utilities', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('usePreviousRender returns the previous render value, even when unchanged', () => {
    const seen: Array<[string, string | undefined]> = [];
    const Probe = ({ value }: { value: string; tick: number }) => {
      seen.push([value, usePreviousRender(value)]);
      return null;
    };

    act(() => root.render(React.createElement(Probe, { value: 'a', tick: 0 })));
    act(() => root.render(React.createElement(Probe, { value: 'b', tick: 0 })));
    // Re-render for another prop: the previous value is now 'b', not 'a'.
    act(() => root.render(React.createElement(Probe, { value: 'b', tick: 1 })));

    expect(seen).toEqual([
      ['a', undefined],
      ['b', 'a'],
      ['b', 'b'],
    ]);
  });

  it('useMedia reads the current match and follows change events', () => {
    let matches = true;
    const listeners = new Set<() => void>();
    const matchMedia = jest.fn((query: string) => ({
      media: query,
      get matches() {
        return matches;
      },
      addEventListener: (_type: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) =>
        listeners.delete(listener),
    }));
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: matchMedia,
    });

    const seen: boolean[] = [];
    const Probe = () => {
      seen.push(useMedia('(min-width: 401px)'));
      return null;
    };

    act(() => root.render(React.createElement(Probe)));
    expect(seen[seen.length - 1]).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(min-width: 401px)');

    act(() => {
      matches = false;
      listeners.forEach((listener) => listener());
    });
    expect(seen[seen.length - 1]).toBe(false);

    act(() => root.unmount());
    expect(listeners.size).toBe(0);
    root = createRoot(container);
  });
});
