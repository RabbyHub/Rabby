import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ExtensionUpdateBanner } from '@/ui/views/Dashboard/components/ExtensionUpdateBanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key.split('.').pop() }),
}));
jest.mock('antd', () => ({
  Button: ({ disabled, onClick, children, className }: any) =>
    require('react').createElement(
      'button',
      { disabled, onClick, className },
      children
    ),
}));

describe('extension update banner', () => {
  let root: Root;
  let container: HTMLDivElement;
  const onCheck = jest.fn();
  const onDismiss = jest.fn();
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.useRealTimers();
  });
  afterAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });
  const render = (visible = true, version = '1.1.0', closable = true) =>
    act(() => {
      root.render(
        createElement(ExtensionUpdateBanner, {
          visible,
          onCheck,
          onDismiss,
          closable,
          key: version,
        })
      );
    });
  const close = () =>
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="dismiss"]')!
        .click()
    );

  it('does not show when no update is available or settings is open', () => {
    render(false);
    expect(container.querySelector('section')).toBeNull();
    expect(onCheck).not.toHaveBeenCalled();
  });
  it('slides out before removing the card without opening settings', () => {
    render();
    close();
    expect(
      container.querySelector('section')?.classList.contains('is-closing')
    ).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>(
        '.extension-update-banner-check'
      )!.disabled
    ).toBe(true);
    act(() => jest.advanceTimersByTime(299));
    expect(container.querySelector('section')).not.toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    render(false);
    expect(container.querySelector('section')).toBeNull();
    expect(onCheck).not.toHaveBeenCalled();
  });
  it('opens settings on Check without starting a dismissal cooldown', () => {
    render();
    act(() =>
      container
        .querySelector<HTMLButtonElement>('.extension-update-banner-check')!
        .click()
    );
    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
    render(false);
    expect(container.querySelector('section')).toBeNull();
    render(true);
    expect(container.querySelector('section')).not.toBeNull();
  });
  it('hides the close button for mandatory updates', () => {
    render(true, '1.1.0', false);
    expect(container.querySelector('[aria-label="dismiss"]')).toBeNull();
    expect(container.querySelector('section')).not.toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();
  });
  it('cleans up the animation timer on unmount', () => {
    render();
    close();
    act(() => root.render(null));
    expect(jest.getTimerCount()).toBe(0);
  });
});
