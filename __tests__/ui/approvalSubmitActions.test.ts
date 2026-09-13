import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { JsxEmit, ModuleKind, transpileModule } from 'typescript';
import { isApprovalProcessDisabled } from '@/ui/views/Approval/components/FooterBar/securityGate';

const signLabel = 'page.signFooterBar.signAndSubmitButton';
const confirmLabel = 'global.confirmButton';

// Mount the entire production component. Only presentation wrappers and wallet
// dependencies are replaced; React state, effects and DOM buttons run normally.
function loadSubmitActions(): React.ComponentType<any> {
  const childrenOnly = ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  const modules: Record<string, unknown> = {
    react: React,
    'react-i18next': { useTranslation: () => ({ t: (key: string) => key }) },
    antd: {
      Button: ({ children, disabled, onClick }: any) =>
        React.createElement('button', { disabled, onClick }, children),
    },
    'styled-components': {
      __esModule: true,
      default: (Component: React.ComponentType) => () => Component,
    },
    clsx: { __esModule: true, default: () => '' },
    '@ant-design/icons': { LoadingOutlined: () => null },
    'ui/assets/close-16-cc.svg': { ReactComponent: () => null },
    './ActionsContainer': { ActionsContainer: childrenOnly },
    './GasLessComponents': { GasLessAnimatedWrapper: childrenOnly },
    '@/ui/component/Tooltip/TooltipWithMagnetArrow': {
      TooltipWithMagnetArrow: childrenOnly,
    },
  };
  const compiled = transpileModule(
    readFileSync(
      resolve(
        __dirname,
        '../../src/ui/views/Approval/components/FooterBar/SubmitActions.tsx'
      ),
      'utf8'
    ),
    {
      compilerOptions: {
        module: ModuleKind.CommonJS,
        jsx: JsxEmit.React,
        esModuleInterop: true,
      },
    }
  ).outputText;
  const exports: any = {};
  runInNewContext(compiled, {
    exports,
    require: (name: string) => {
      if (!(name in modules))
        throw new Error(`Missing test dependency ${name}`);
      return modules[name];
    },
  });
  return exports.SubmitActions;
}

describe('approval second confirmation', () => {
  const SubmitActions = loadSubmitActions();
  const reactActEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  let root: Root;
  let container: HTMLDivElement;
  let onSubmit: jest.Mock;

  const render = ({
    securityBlocked = false,
    disabledProcess = false,
    isSubmitting = false,
  } = {}) =>
    act(() =>
      root.render(
        React.createElement(SubmitActions, {
          onSubmit,
          onCancel: jest.fn(),
          account: {},
          isSubmitting,
          disabledProcess: isApprovalProcessDisabled({
            securityBlocked,
            disabledProcess,
            hasUnprocessedSecurityResult: false,
            payGasByGasAccount: false,
            useGasLess: false,
          }),
        })
      )
    );
  const button = (label: string) =>
    Array.from(container.querySelectorAll('button')).find(
      (element) => element.textContent === label
    );
  const click = (element: HTMLButtonElement) => act(() => element.click());

  beforeEach(() => {
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
    onSubmit = jest.fn();
  });

  afterEach(() => {
    act(() => root.unmount());
    delete reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
  });

  test.each([{ securityBlocked: true }, { disabledProcess: true }])(
    'revokes an open confirmation when blocked by %j and requires fresh confirmation',
    (block) => {
      render();
      click(button(signLabel)!);
      const oldConfirm = button(confirmLabel)!;
      expect(oldConfirm.disabled).toBe(false);

      render(block);
      expect(button(confirmLabel)).toBeUndefined();
      expect(button(signLabel)?.disabled).toBe(true);
      click(oldConfirm);
      click(button(signLabel)!);
      expect(onSubmit).not.toHaveBeenCalled();

      render();
      expect(button(confirmLabel)).toBeUndefined();
      expect(button(signLabel)?.disabled).toBe(false);
      click(button(signLabel)!);
      expect(onSubmit).not.toHaveBeenCalled();
      click(button(confirmLabel)!);
      expect(onSubmit).toHaveBeenCalledTimes(1);
    }
  );

  test('disables confirmation while submission is in progress', () => {
    render();
    click(button(signLabel)!);
    click(button(confirmLabel)!);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    render({ isSubmitting: true });
    const confirm = button(confirmLabel)!;
    expect(confirm.disabled).toBe(true);
    click(confirm);
    click(confirm);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
