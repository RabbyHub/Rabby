import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { runInNewContext } from 'vm';
import ts from 'typescript';

// Load the production display component without initializing the Safe queue's
// wallet and signing dependencies. The label helper is tested separately.
const filename = resolve(
  __dirname,
  '../../src/ui/views/GnosisQueue/components/GnosisTransactionQueue/GnosisTransactionQueueList.tsx'
);
const source = ts.createSourceFile(
  filename,
  readFileSync(filename, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
const declaration = source.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations])
  .find((item) => item.name.getText(source) === 'TransactionExplain');
if (!declaration) throw new Error('Cannot locate TransactionExplain');
const compiled = ts.transpileModule(
  `export const ${declaration.getText(source)};`,
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
    },
  }
).outputText;
const getActionTypeTextByType = jest.fn(() => 'Swap Token');
const useRequest = jest.fn();
const component = {} as { TransactionExplain: React.ComponentType<any> };
runInNewContext(compiled, {
  exports: component,
  React,
  useTranslation: () => ({ t: (key: string) => key }),
  useWallet: () => ({}),
  useRequest,
  isKnownActionType: (type: string) =>
    type === 'swap_token' || type === 'contract_call',
  getActionTypeTextByType,
  IconUnknown: 'unknown.svg',
  Button: ({ children }: { children: React.ReactNode }) =>
    React.createElement('button', null, children),
});

const render = (type: string | undefined, func?: string, logo?: string) => {
  useRequest.mockReturnValue({ data: logo ? { logo_url: logo } : undefined });
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(
    React.createElement(component.TransactionExplain, {
      explain: {
        action: type === undefined ? undefined : { type, data: {} },
        contract_call: func === undefined ? undefined : { func },
      },
      serverId: 'eth',
      isViewLoading: false,
      onView: jest.fn(),
    })
  );
  return {
    label: container.querySelector('span')?.textContent,
    icon: container.querySelector('img')?.getAttribute('src'),
  };
};

describe('Safe queue transaction summary', () => {
  beforeEach(() => getActionTypeTextByType.mockClear());

  test('uses the known action label even when a contract method is available', () => {
    expect(
      render('swap_token', 'swapExactTokensForTokens', 'protocol.svg')
    ).toEqual({
      label: 'Swap Token',
      icon: 'protocol.svg',
    });
    expect(getActionTypeTextByType).toHaveBeenCalledWith('swap_token');
  });

  test.each(['contract_call', 'new_action', undefined])(
    'shows the original contract method for action %j',
    (type) => {
      expect(render(type, 'execute', 'protocol.svg')).toEqual({
        label: 'execute',
        icon: 'protocol.svg',
      });
      expect(getActionTypeTextByType).not.toHaveBeenCalled();
    }
  );

  test('keeps the fallback icon when the contract has no protocol logo', () => {
    expect(render('new_action', 'execute')).toEqual({
      label: 'execute',
      icon: 'unknown.svg',
    });
  });

  test.each([undefined, ''])(
    'keeps the unknown transaction label for a missing or empty method (%j)',
    (func) => {
      expect(render('new_action', func)).toEqual({
        label: 'page.safeQueue.unknownTx',
        icon: 'unknown.svg',
      });
      expect(getActionTypeTextByType).not.toHaveBeenCalled();
    }
  );
});
