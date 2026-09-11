import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { message } from 'antd';
import { ExtensionUpdateCard } from '@/ui/views/Dashboard/components/Settings/components/ExtensionUpdateCard';
import { ExtensionUpdateDialog } from '@/ui/views/Dashboard/components/Settings/components/ExtensionUpdateDialog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key.split('.').pop() }),
}));

jest.mock('antd', () => ({
  message: { error: jest.fn() },
  Modal: ({ visible, children }: any) => (visible ? children : null),
  Button: ({ loading, onClick, children, className }: any) =>
    require('react').createElement(
      'button',
      {
        onClick,
        disabled: loading,
        className,
      },
      children
    ),
}));

describe('extension update card', () => {
  let root: Root;
  let container: HTMLDivElement;
  const onUpdate = jest.fn();
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    onUpdate.mockResolvedValue(undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  afterAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });
  const render = (version = '1.2.3.4') =>
    act(() => {
      root.render(
        createElement(ExtensionUpdateCard, {
          version,
          changelog: '1. New feature\n2. Bug fix',
          onUpdate,
        })
      );
    });

  it('shows the pending version without initiating an update', () => {
    render();
    expect(container.textContent).toContain('v1.2.3.4');
    expect(container.textContent).toContain('1. New feature');
    expect(container.textContent).toContain('2. Bug fix');
    const notes = container.querySelector('.extension-update-card-notes')!;
    expect(notes.textContent).toBe('1. New feature\n2. Bug fix');
    expect(notes.querySelector('li, img')).toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('opens the dialog without updating and only updates on confirmation', async () => {
    const onClose = jest.fn();
    act(() =>
      root.render(
        createElement(ExtensionUpdateDialog, {
          visible: true,
          version: '1.2.3.4',
          changelog: '1. New feature',
          onClose,
          onUpdate,
        })
      )
    );
    expect(container.textContent).toContain('v1.2.3.4');
    expect(
      container.querySelector('.extension-update-card-dialog')
    ).not.toBeNull();
    expect(container.querySelector('.extension-update-card-logo')).toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('.extension-update-card-button')!
        .click()
    );
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('closes the dialog without updating and can reopen it', () => {
    const onClose = jest.fn();
    const renderDialog = (visible: boolean) =>
      act(() =>
        root.render(
          createElement(ExtensionUpdateDialog, {
            visible,
            version: '1.2.3.4',
            changelog: '1. New feature',
            onClose,
            onUpdate,
          })
        )
      );
    renderDialog(true);
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="dismiss"]')!
        .click()
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
    renderDialog(false);
    expect(container.querySelector('section')).toBeNull();
    renderDialog(true);
    expect(container.textContent).toContain('v1.2.3.4');
  });

  it('dismisses only the current version and shows a newer one', () => {
    render();
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="dismiss"]')!
        .click()
    );
    expect(container.querySelector('section')).toBeNull();
    render();
    expect(container.querySelector('section')).toBeNull();
    render('1.2.4');
    expect(container.textContent).toContain('v1.2.4');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('disables duplicate updates while the request is pending', async () => {
    let finish!: () => void;
    onUpdate.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      })
    );
    render();
    const button = container.querySelector<HTMLButtonElement>(
      '.extension-update-card-button'
    )!;
    act(() => {
      button.click();
      button.click();
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
    await act(async () => finish());
    expect(button.disabled).toBe(false);
  });

  it('reports errors and allows retry', async () => {
    onUpdate.mockRejectedValueOnce(new Error('Cannot open updating page'));
    render();
    const button = container.querySelector<HTMLButtonElement>(
      '.extension-update-card-button'
    )!;
    await act(async () => button.click());
    expect(message.error).toHaveBeenCalledWith('Cannot open updating page');
    expect(button.disabled).toBe(false);
    await act(async () => button.click());
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });
});
