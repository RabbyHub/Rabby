import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { useDocumentClass } from '@/ui/hooks/useDocumentClass';

const CLASS = 'test-global-active';

const Probe = ({ active }: { active?: boolean }) => {
  useDocumentClass(CLASS, active);
  return null;
};

const mount = (active?: boolean) => {
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(React.createElement(Probe, { active })));
  return root;
};

const unmount = (root: Root) => act(() => root.unmount());

const hasClass = () => document.documentElement.classList.contains(CLASS);

describe('useDocumentClass', () => {
  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('keeps the class until the last instance unmounts', () => {
    const first = mount();
    const second = mount();
    expect(hasClass()).toBe(true);

    unmount(first);
    expect(hasClass()).toBe(true);

    unmount(second);
    expect(hasClass()).toBe(false);
  });

  it('follows the active flag', () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => root.render(React.createElement(Probe, { active: false })));
    expect(hasClass()).toBe(false);

    act(() => root.render(React.createElement(Probe, { active: true })));
    expect(hasClass()).toBe(true);

    act(() => root.render(React.createElement(Probe, { active: false })));
    expect(hasClass()).toBe(false);

    unmount(root);
  });
});
