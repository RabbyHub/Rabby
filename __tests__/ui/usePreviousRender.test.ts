import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { usePreviousRender } from '@/ui/hooks/usePreviousRender';

describe('usePreviousRender', () => {
  let root: Root;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    root = createRoot(document.createElement('div'));
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('returns the previous render value, even when unchanged', () => {
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
});
