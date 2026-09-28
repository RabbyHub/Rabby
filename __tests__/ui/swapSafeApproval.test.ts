import BigNumber from 'bignumber.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import ts from 'typescript';

// Execute the production submit callback and button state without mounting the
// complete Swap page and its quote, hardware, and signing dependencies.
const filename = resolve(
  __dirname,
  '../../src/ui/views/Swap/Component/Main.tsx'
);
const source = ts.createSourceFile(
  filename,
  readFileSync(filename, 'utf8'),
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
const main = source.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations])
  .find((declaration) => declaration.name.getText(source) === 'Main');
if (!main?.initializer || !ts.isArrowFunction(main.initializer)) {
  throw new Error('Cannot locate Swap Main');
}
const mainBody = main.initializer.body;
if (!ts.isBlock(mainBody)) throw new Error('Cannot locate Swap Main body');
const declarations = mainBody.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations]);

const declarationByName = (name: string) => {
  const declaration = declarations.find((item) => {
    if (ts.isIdentifier(item.name)) return item.name.text === name;
    return item.name.elements.some(
      (element) =>
        ts.isBindingElement(element) && element.name.getText(source) === name
    );
  });
  if (!declaration) throw new Error(`Cannot locate Swap ${name}`);
  return declaration;
};

const callbackSource = (name: string) => {
  const initializer = declarationByName(name).initializer;
  if (!initializer || !ts.isCallExpression(initializer)) {
    throw new Error(`Cannot locate Swap ${name} callback`);
  }
  return initializer.arguments[0].getText(source);
};

const compiled = ts.transpileModule(
  [
    ...['isGnosis', 'shouldTwoStepSwap', 'isApprove'].map(
      (name) => `const ${declarationByName(name).getText(source)};`
    ),
    `export const submit = ${callbackSource('gotoSwap')};`,
    `export const label = (${callbackSource('btnText')})();`,
  ].join('\n'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
).outputText;

const safeType = 'Gnosis';
const spender = '0x1111111111111111111111111111111111111111';
const payToken = {
  id: '0x2222222222222222222222222222222222222222',
  decimals: 6,
};
const quote = {
  fromTokenAmount: '1000000',
  toTokenAmount: '2000000',
  toTokenDecimals: 6,
};

function loadSwap({
  accountType = safeType,
  shouldApproveToken = true,
  shouldTwoStepApprove = false,
  shouldTwoStepDirectSwap = false,
  isDirectApprove = false,
  approveTxPending = false,
  approvalResult = undefined as string | undefined,
} = {}) {
  const wallet = {
    approveToken: jest.fn().mockResolvedValue(approvalResult),
    dexSwap: jest.fn().mockResolvedValue('swap-result'),
  };
  const handleAmountChange = jest.fn();
  const resumeQuoteRefresh = jest.fn();
  const context = {
    currentAccount: { type: accountType },
    KEYRING_CLASS: { GNOSIS: safeType },
    shouldTwoStepDirectSwap,
    isDirectApprove,
    approveTxPending,
    activeProvider: {
      name: 'Uniswap',
      shouldApproveToken,
      shouldTwoStepApprove,
      quote,
    },
    wallet,
    inSufficient: false,
    payToken,
    receiveToken: { id: 'receive-token', decimals: 6 },
    preferMEVGuarded: true,
    chain: 'ETH',
    DEX_ENUM: { WRAPTOKEN: 'WrapToken' },
    DEX_SPENDER_WHITELIST: { Uniswap: { ETH: spender } },
    payTokenIsGasToken: false,
    passGasPrice: false,
    gasList: [],
    gasLevel: 'normal',
    inputAmount: '1',
    slippage: '0.5',
    feeRate: '0',
    userAddress: '0x3333333333333333333333333333333333333333',
    findChain: () => ({ id: 1, serverId: 'eth' }),
    findChainByEnum: () => ({ id: 1, serverId: 'eth' }),
    rbiSource: 'test',
    swapUseSlider: false,
    isTab: true,
    isDesktop: false,
    window: { close: jest.fn() },
    handleAmountChange,
    resumeQuoteRefresh,
    BigNumber,
    console: { error: jest.fn() },
    isSupportedChain: true,
    quoteLoading: false,
    t: (key: string) => key,
  };
  const loaded = {} as { submit: () => Promise<void>; label: string };
  runInNewContext(compiled, { ...context, exports: loaded });
  return { ...loaded, wallet, handleAmountChange, resumeQuoteRefresh };
}

describe('Safe Swap approval steps', () => {
  test.each(['owner-signature', undefined])(
    'submits only the Safe approval and preserves input when its result is %j',
    async (approvalResult) => {
      const page = loadSwap({ approvalResult });

      await page.submit();

      expect(page.wallet.approveToken).toHaveBeenCalledTimes(1);
      expect(page.wallet.approveToken.mock.calls[0].slice(0, 4)).toEqual([
        'eth',
        payToken.id,
        spender,
        quote.fromTokenAmount,
      ]);
      expect(page.wallet.dexSwap).not.toHaveBeenCalled();
      expect(page.handleAmountChange).not.toHaveBeenCalled();
      expect(page.resumeQuoteRefresh).toHaveBeenCalledTimes(1);
    }
  );

  test('submits only the allowance reset when Safe requires zero-first approval', async () => {
    const page = loadSwap({ shouldTwoStepApprove: true });

    await page.submit();

    expect(page.wallet.approveToken).toHaveBeenCalledTimes(1);
    expect(page.wallet.approveToken.mock.calls[0].slice(0, 4)).toEqual([
      'eth',
      payToken.id,
      spender,
      0,
    ]);
    expect(page.wallet.dexSwap).not.toHaveBeenCalled();
    expect(page.handleAmountChange).not.toHaveBeenCalled();
  });

  test('does not continue or clear input when the Safe approval is rejected', async () => {
    const page = loadSwap();
    page.wallet.approveToken.mockRejectedValue(new Error('User rejected'));

    await page.submit();

    expect(page.wallet.dexSwap).not.toHaveBeenCalled();
    expect(page.handleAmountChange).not.toHaveBeenCalled();
  });

  test('submits the swap when Safe already has sufficient allowance', async () => {
    const page = loadSwap({ shouldApproveToken: false });

    await page.submit();

    expect(page.wallet.approveToken).not.toHaveBeenCalled();
    expect(page.wallet.dexSwap).toHaveBeenCalledWith(
      expect.objectContaining({ needApprove: false, quote }),
      expect.anything()
    );
    expect(page.handleAmountChange).toHaveBeenCalledWith('');
  });

  test('preserves combined approval and swap for ordinary accounts', async () => {
    const page = loadSwap({ accountType: 'HD Key Tree' });

    await page.submit();

    expect(page.wallet.approveToken).not.toHaveBeenCalled();
    expect(page.wallet.dexSwap).toHaveBeenCalledWith(
      expect.objectContaining({ needApprove: true, quote }),
      expect.anything()
    );
    expect(page.handleAmountChange).toHaveBeenCalledWith('');
  });

  test.each([
    [{}, 'page.swap.approve'],
    [{ shouldApproveToken: false }, 'page.swap.title'],
    [{ accountType: 'HD Key Tree' }, 'page.swap.approve-swap'],
    [
      { accountType: 'HD Key Tree', shouldApproveToken: false },
      'page.swap.title',
    ],
    [
      {
        accountType: 'HD Key Tree',
        shouldTwoStepDirectSwap: true,
        isDirectApprove: true,
      },
      'page.swap.approve',
    ],
  ])('shows the appropriate action for %j', (options, expectedLabel) => {
    expect(loadSwap(options).label).toBe(expectedLabel);
  });
});
