import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { message } from 'antd';
import { useExtensionUpdateStore } from '@/ui/state/extensionUpdate';
import { ExtensionUpdateCard } from '@/ui/views/Dashboard/components/Settings/components/ExtensionUpdateCard';
import { ExtensionUpdateDialog } from '@/ui/views/Dashboard/components/Settings/components/ExtensionUpdateDialog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key.split('.').pop() }),
}));

jest.mock('@/ui/wallet', () => ({
  wallet: {
    getStorageSnapshot: jest.fn().mockResolvedValue({
      origin: 'background-1',
      revision: 1,
      state: { pendingVersion: '1.1.0' },
    }),
    setStorageItem: jest.fn(),
  },
  onWalletReconnect: jest.fn(() => () => undefined),
}));

jest.mock('antd', () => ({
  message: { error: jest.fn() },
  Modal: ({ visible, children }: any) => (visible ? children : null),
  Button: ({ loading, onClick, children, className }: any) =>
    jest.requireActual('react').createElement(
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

  beforeAll(async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    await useExtensionUpdateStore.persist.hydrationPromise();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    useExtensionUpdateStore.setState({ versionInfo: null });
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
    useExtensionUpdateStore.persist.destroy();
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  });
  const render = (
    version = '1.2.3.4',
    variant: 'card' | 'dialog' = 'card',
    changelog = '1. New feature\n2. Bug fix'
  ) =>
    act(() => {
      root.render(
        createElement(ExtensionUpdateCard, {
          version,
          variant,
          changelog,
          onUpdate,
        })
      );
    });

  it('shows the pending version without initiating an update', () => {
    render();
    expect(container.textContent).toContain('V 1.2.3.4');
    expect(container.textContent).toContain('1. New feature');
    expect(container.textContent).toContain('2. Bug fix');
    const notes = container.querySelector('.extension-update-card-notes')!;
    expect(Array.from(notes.children, (line) => line.textContent)).toEqual([
      '1. New feature',
      '2. Bug fix',
    ]);
    expect(notes.querySelector('li, img')).toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  describe.each(['card', 'dialog'] as const)('%s changelog', (variant) => {
    it.each(['', '   ', '\n\t\r\n'])(
      'shows the default message as a list item for empty or whitespace-only content (%j)',
      (changelog) => {
        render('1.2.3.4', variant, changelog);
        const notes = container.querySelector('.extension-update-card-notes')!;
        expect(notes.textContent).toBe(
          'Fixed some bugs and optimized user experience'
        );
        expect(notes.children).toHaveLength(1);
        expect(
          notes.querySelector('.extension-update-card-note-li')?.textContent
        ).toBe('Fixed some bugs and optimized user experience');
        expect(
          notes.querySelector('.extension-update-card-note-line')
        ).toBeNull();
        expect(onUpdate).not.toHaveBeenCalled();
      }
    );

    it('preserves non-empty content and its existing line formatting', () => {
      render('1.2.3.4', variant, '# Updates\n- New feature\n  Details  ');
      const notes = container.querySelector('.extension-update-card-notes')!;
      expect(
        notes.querySelector('.extension-update-card-note-title')?.textContent
      ).toBe('Updates');
      expect(
        notes.querySelector('.extension-update-card-note-li')?.textContent
      ).toBe('New feature');
      expect(
        notes.querySelector('.extension-update-card-note-line')?.textContent
      ).toBe('  Details  ');
      expect(notes.textContent).not.toContain(
        'Fixed some bugs and optimized user experience'
      );
    });
  });

  it.each([
    [4, 1, 'card', true],
    [1, 3, 'card', true],
    [3, 1, 'card', false],
    [1, 4, 'card', true],
    [2, 2, 'card', true],
    [4, 1, 'dialog', true],
    [1, 4, 'dialog', true],
    [3, 1, 'dialog', false],
  ] as const)(
    'uses current level %s and latest level %s for the %s variant dot (%s)',
    (currentLevel, latestLevel, variant, showDot) => {
      useExtensionUpdateStore.setState({
        versionInfo: {
          version: { id: '1.0.0', level: currentLevel, changelog: '' },
          latest_version: { id: '1.1.0', level: latestLevel, changelog: '' },
        },
      });
      render('1.1.0', variant);
      expect(
        !!container.querySelector('.extension-update-card-version img')
      ).toBe(showDot);
    }
  );

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
    expect(container.textContent).toContain('V 1.2.3.4');
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

  it.each([
    [4, 1, 'card', false],
    [4, 3, 'card', false],
    [1, 4, 'card', false],
    [3, 1, 'card', true],
    [1, 2, 'card', true],
    [1, 3, 'card', true],
    [4, 1, 'dialog', true],
    [1, 4, 'dialog', true],
  ] as const)(
    'uses current level %s and latest level %s for the %s variant close button (%s)',
    (currentLevel, latestLevel, variant, showClose) => {
      useExtensionUpdateStore.setState({
        versionInfo: {
          version: { id: '1.0.0', level: currentLevel, changelog: '' },
          latest_version: { id: '1.1.0', level: latestLevel, changelog: '' },
        },
      });
      render('1.1.0', variant);
      expect(!!container.querySelector('.extension-update-card-close')).toBe(
        showClose
      );
      expect(container.querySelector('section')).not.toBeNull();
      expect(onUpdate).not.toHaveBeenCalled();
    }
  );

  it('closes and reopens the dialog without updating even for mandatory updates', () => {
    useExtensionUpdateStore.setState({
      versionInfo: {
        version: { id: '1.0.0', level: 4, changelog: '' },
        latest_version: { id: '1.2.3.4', level: 1, changelog: '' },
      },
    });
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
    expect(container.textContent).toContain('V 1.2.3.4');
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
    expect(container.textContent).toContain('V 1.2.4');
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
