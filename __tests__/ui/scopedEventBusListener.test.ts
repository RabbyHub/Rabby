import React, { act, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import eventBus from '@/eventBus';
import { useScopedEventBusListener } from '@/ui/hooks/useEventBusListener';

const EVENT = 'SCOPED_LISTENER_TEST_EVENT';

describe('useScopedEventBusListener', () => {
  let container: HTMLDivElement;
  let root: Root;
  let addScopedListener: ReturnType<typeof useScopedEventBusListener>;

  const Probe = ({ onEvent }: { onEvent: (data: any) => void }) => {
    addScopedListener = useScopedEventBusListener();
    useEffect(() => {
      addScopedListener(EVENT, onEvent);
    }, []);
    return null;
  };

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
    eventBus.removeAllEventListeners(EVENT);
  });

  it('removes its listeners when the component unmounts', () => {
    const onEvent = jest.fn();
    act(() => root.render(React.createElement(Probe, { onEvent })));

    eventBus.emit(EVENT, 'first');
    expect(onEvent).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    eventBus.emit(EVENT, 'after-unmount');
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(eventBus.events[EVENT]).toEqual([]);
  });

  it('ignores a registration that lands after unmount (async init)', () => {
    const onEvent = jest.fn();
    act(() => root.render(React.createElement(Probe, { onEvent })));
    const lateAdd = addScopedListener;
    act(() => root.unmount());

    const late = jest.fn();
    lateAdd(EVENT, late);
    eventBus.emit(EVENT, 'after-unmount');
    expect(late).not.toHaveBeenCalled();
    expect(eventBus.events[EVENT]).toEqual([]);
  });

  it('does not remove listeners another component registered', () => {
    const other = jest.fn();
    eventBus.addEventListener(EVENT, other);

    act(() => root.render(React.createElement(Probe, { onEvent: jest.fn() })));
    act(() => root.unmount());

    eventBus.emit(EVENT, 'x');
    expect(other).toHaveBeenCalledTimes(1);
    eventBus.removeEventListener(EVENT, other);
  });
});
