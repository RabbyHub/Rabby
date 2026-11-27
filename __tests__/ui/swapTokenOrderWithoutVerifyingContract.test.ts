import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import { ModuleKind, transpileModule } from 'typescript';
import { ellipsis } from '@/ui/utils/address';

// Off-chain order-book intents (e.g. account.quip.network on Base) are signed
// with an EIP-712 domain that has no `verifyingContract`. rabby-action then has
// no `contractId`, so fetchDataSwapTokenOrder returns `{}` as requireData while
// the API still classifies the message as `swap_token_order`. The "List on"
// row rendered <Values.Address address={requireData.id} />, which called
// ellipsis(undefined) and crashed the whole notification window (RABBY-5YD),
// leaving the dApp stuck on "Waiting for signature".

const passThrough = ({ children }: any) =>
  React.createElement('div', null, children);

const loadSwapTokenOrder = () => {
  const Div = ({ children, className }: any) =>
    React.createElement('div', { className }, children);
  const securityState = {
    rules: [],
    currentTx: { processedRules: [] },
    userData: { contractWhitelist: [] },
    openRuleDrawer: () => {},
  };
  const modules: Record<string, any> = {
    react: React,
    'styled-components': { __esModule: true, default: { div: () => Div } },
    'react-i18next': { useTranslation: () => ({ t: (key: string) => key }) },
    '@/ui/utils/number': {
      formatAmount: (v: any) => String(v),
      formatUsdValue: (v: any) => String(v),
    },
    '@/ui/state/securityEngine': {
      useSecurityEngineStore: (selector: any) => selector(securityState),
    },
    'zustand/react/shallow': { useShallow: (fn: any) => fn },
    '../Actions/components/Table': {
      Table: passThrough,
      Col: passThrough,
      Row: passThrough,
    },
    '../Actions/components/LogoWithText': {
      __esModule: true,
      default: ({ text }: any) => React.createElement('span', null, text),
    },
    // Address keeps the real ellipsis() so an undefined address still throws.
    '../Actions/components/Values': {
      Address: ({ address }: any) =>
        React.createElement('span', null, ellipsis(address)),
      AddressWithCopy: ({ address }: any) =>
        React.createElement('span', null, ellipsis(address)),
      TokenSymbol: ({ token }: any) =>
        React.createElement('span', null, token.symbol),
      TokenLabel: () => null,
      Percentage: () => null,
      TimeSpanFuture: () => null,
      AccountAlias: () => null,
      KnownAddress: () => null,
      Interacted: () => null,
    },
    '../Actions/components/ViewMore': {
      __esModule: true,
      default: ({ children }: any) => children,
    },
    '../Actions/components/SecurityListItem': { SecurityListItem: () => null },
    '../Actions/components/ProtocolListItem': { ProtocolListItem: () => null },
    '../SecurityEngine/SecurityLevelTagNoText': {
      __esModule: true,
      default: () => null,
    },
    '@/ui/utils': {
      isSameAddress: (a: string, b: string) =>
        !!a && !!b && a.toLowerCase() === b.toLowerCase(),
    },
    '../Actions/components/SubTable': {
      SubCol: passThrough,
      SubRow: passThrough,
      SubTable: passThrough,
    },
  };
  const compiled = transpileModule(
    readFileSync(
      resolve(
        __dirname,
        '../../src/ui/views/Approval/components/TypedDataActions/SwapTokenOrder.tsx'
      ),
      'utf8'
    ),
    {
      compilerOptions: {
        module: ModuleKind.CommonJS,
        jsx: 2,
        esModuleInterop: true,
      },
    }
  ).outputText;
  const exports: any = {};
  runInNewContext(compiled, {
    exports,
    module: { exports },
    document,
    window,
    require: (name: string) => {
      if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
      return modules[name];
    },
  });
  return exports.default;
};

describe('SwapTokenOrder typed data without a verifyingContract', () => {
  let root: Root;
  let container: HTMLDivElement;
  let SwapTokenOrder: any;

  const chain = { serverId: 'base', name: 'Base' };
  const token = (symbol: string) => ({
    symbol,
    logo_url: '',
    amount: 1,
    is_verified: true,
    is_suspicious: false,
  });
  const data = {
    payToken: token('USDC'),
    receiveToken: token('WETH'),
    receiver: '0x2222222222222222222222222222222222222222',
    usdValueDiff: '0',
    usdValuePercentage: 0,
    expireAt: null,
  };
  const contract = '0x1111111111111111111111111111111111111111';

  const render = (requireData: Record<string, any>) =>
    act(() => {
      root.render(
        React.createElement(SwapTokenOrder, {
          data,
          requireData,
          chain,
          engineResults: [],
        })
      );
    });

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    root = createRoot(container);
    SwapTokenOrder = loadSwapTokenOrder();
  });

  afterEach(() => {
    act(() => root.unmount());
    delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
  });

  test('renders the order without the "List on" row when requireData is empty', () => {
    expect(() => render({})).not.toThrow();

    expect(container.textContent).toContain('page.signTx.swap.payToken');
    expect(container.textContent).toContain('page.signTx.swap.receiver');
    expect(container.textContent).not.toContain(
      'page.signTypedData.buyNFT.listOn'
    );
  });

  test('still shows the "List on" contract when the domain has one', () => {
    render({
      id: contract,
      sender: '0x3333333333333333333333333333333333333333',
      protocol: null,
      hasInteraction: false,
    });

    expect(container.textContent).toContain('page.signTypedData.buyNFT.listOn');
    expect(container.textContent).toContain(ellipsis(contract));
  });
});
