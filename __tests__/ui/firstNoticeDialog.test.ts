import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Modal } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FirstNoticeDialog } from '@/ui/views/Dashboard/components/FirstNoticeDialog';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key.split('.').pop() }),
}));

jest.mock('react-markdown', () => ({
  __esModule: true,
  default: jest.fn(({ className, children }) =>
    require('react').createElement('div', { className }, children)
  ),
}));
jest.mock('remark-gfm', () => ({ __esModule: true, default: jest.fn() }));

jest.mock('antd', () => ({
  Modal: jest.fn(({ visible, title, children, footer, onCancel }: any) =>
    visible
      ? require('react').createElement(
          'div',
          { role: 'dialog' },
          title,
          require('react').createElement(
            'button',
            { 'aria-label': 'Close', onClick: onCancel },
            'Close'
          ),
          children,
          footer
        )
      : null
  ),
  Button: ({ onClick, children, className }: any) =>
    require('react').createElement('button', { onClick, className }, children),
}));

describe('first notice dialog', () => {
  let root: Root;
  let container: HTMLDivElement;
  const onClose = jest.fn();
  const previousActEnvironment = (globalThis as any).IS_REACT_ACT_ENVIRONMENT;

  beforeAll(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(() => {
    jest.clearAllMocks();
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

  const updateContent = '- **New feature**\n- ~~Old behavior~~';
  const render = (visible = true) =>
    act(() => {
      root.render(
        createElement(FirstNoticeDialog, {
          visible,
          version: '0.94.7',
          updateContent,
          onClose,
        })
      );
    });

  it('shows the installed version and passes the original changelog to GFM Markdown', () => {
    render();
    expect(container.querySelector('.first-notice-title')?.textContent).toBe(
      'title'
    );
    expect(container.querySelector('.first-notice-version')?.textContent).toBe(
      'V 0.94.7'
    );
    expect(
      ((ReactMarkdown as unknown) as jest.Mock).mock.calls[0][0]
    ).toMatchObject({
      children: updateContent,
      remarkPlugins: [remarkGfm],
    });
    expect(((Modal as unknown) as jest.Mock).mock.calls[0][0]).toMatchObject({
      width: 360,
      centered: true,
      destroyOnClose: true,
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('acknowledges the notice with Got it', () => {
    render();
    act(() =>
      container
        .querySelector<HTMLButtonElement>('.first-notice-button')!
        .click()
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses the same acknowledgement callback for cancel / close', () => {
    render();
    act(() =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Close"]')!
        .click()
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('follows the visibility prop without acknowledging automatically', () => {
    render(false);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    render(true);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    render(false);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});
