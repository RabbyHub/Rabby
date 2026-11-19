import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';
import * as ts from 'typescript';

jest.mock('@/constant', () => ({
  CHAINS: {},
  CHAINS_ENUM: { ETH: 'ETH' },
  INTERNAL_REQUEST_ORIGIN: 'https://rabby.io',
  SIGN_PERMISSION_TYPES: {},
}));
jest.mock('@/background/utils', () => ({ createPersistStore: jest.fn() }));
jest.mock('@/utils/chain', () => ({
  findChain: () => ({ enum: 'ETH' }),
  waitForLocalMainnetList: jest.fn(),
}));
jest.mock('background/service', () => ({
  permissionService: jest.requireActual('@/background/service/permission')
    .default,
}));

import permissionService, {
  ConnectedSite,
} from '@/background/service/permission';
import sessionService from '@/background/service/session';
import { createPersistStore } from '@/background/utils';

// Run the real controller methods without booting keyrings and hardware services.
function properties(file: string, names: string[]) {
  const source = ts.createSourceFile(
    file,
    readFileSync(resolve(file), 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isPropertyDeclaration(node) || ts.isVariableDeclaration(node)) &&
      names.includes(node.name.getText(source)) &&
      node.initializer
    ) {
      found.push(
        `${node.name.getText(source)} = ${node.initializer.getText(source)};`
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (found.length !== names.length)
    throw new Error('Missing controller method');
  return found.join('\n');
}

const methods = properties('src/background/controller/wallet.ts', [
  'removeAddress',
  'removeConnectedSite',
  'resetCurrentAccount',
]);
const accountQuery = properties(
  'src/background/controller/provider/controller.ts',
  ['ethAccounts']
);
const accountComparison = properties('src/utils/account.ts', ['isSameAccount']);
const a = { address: '0xAa', type: 'HD Key Tree', brandName: 'HD Key Tree' };
const b = { ...a, address: '0xbb' };

describe('address deletion preserves dapp consent boundaries', () => {
  let wallet: any;
  let current: typeof a;
  let preferenceService: any;
  let accounts: any;

  const site = (
    origin: string,
    account = a,
    isConnected = true
  ): ConnectedSite => ({
    origin,
    account,
    isConnected,
    name: origin,
    icon: '',
    chain: 'ETH' as any,
    isSigned: true,
    isTop: true,
    isFavorite: true,
  });
  const connectSessions = async (sites: ConnectedSite[]) => {
    jest.mocked(createPersistStore).mockResolvedValue({
      dumpCache: sites.map((v) => ({ k: v.origin, v, e: 0 })),
    });
    await permissionService.init();
    return sites.map((s, i) => {
      const session = sessionService.getOrCreateSession(i, s.origin)!;
      session.setProp(s);
      session.pushMessage = jest.fn();
      return session.pushMessage as jest.Mock;
    });
  };
  const query = (origin: string) =>
    accounts.ethAccounts({
      session: { origin },
      account: permissionService.getConnectedSite(origin)?.account || current,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    sessionService.getSessionMap().clear();
    current = b;
    preferenceService = {
      getCurrentAccount: () => current,
      setCurrentAccount: jest.fn((account) => {
        current = account;
        sessionService.broadcastEvent('accountsChanged', [account.address]);
      }),
    };
    const cleanup = { deleteForAddress: jest.fn() };
    const context = {
      permissionService,
      sessionService,
      preferenceService,
      keyringService: {
        removeAccount: jest.fn(),
        hasAddress: jest.fn(async () => true),
      },
      syncDbService: cleanup,
      historyDbService: cleanup,
      tokenDbService: cleanup,
      defiDbService: cleanup,
      appChainDbService: cleanup,
      balanceDbService: cleanup,
      nftDbService: cleanup,
    };
    wallet = runInNewContext(
      ts.transpileModule(
        `
      const ${accountComparison}
      new (class {
        killWalletConnectConnector = async () => {};
        getAccounts = async () => [${JSON.stringify(b)}];
        ${methods}
      })()
    `,
        { compilerOptions: { target: ts.ScriptTarget.ES2022 } }
      ).outputText,
      context
    );
    accounts = runInNewContext(
      ts.transpileModule(`new (class { ${accountQuery} })()`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      }).outputText,
      { permissionService, Wallet: { isUnlocked: () => true } }
    );
  });

  test('disconnects all sites bound to a removed address without revealing the current address', async () => {
    const [first, second, other] = await connectSessions([
      site('https://first.example'),
      site('https://second.example'),
      site('https://other.example', b),
    ]);
    await wallet.removeAddress(a.address, a.type, a.brandName);

    expect(first.mock.calls).toEqual([['accountsChanged', []]]);
    expect(second.mock.calls).toEqual([['accountsChanged', []]]);
    expect(other).not.toHaveBeenCalled();
    await expect(query('https://first.example')).resolves.toEqual([]);
    await expect(query('https://other.example')).resolves.toEqual([b.address]);
    expect(permissionService.getSite('https://first.example')).toMatchObject({
      isConnected: false,
      account: undefined,
      isFavorite: true,
      isTop: true,
    });
  });

  test('disconnects before selecting a replacement for the deleted current account', async () => {
    current = a;
    const [removed, other] = await connectSessions([
      site('https://removed.example'),
      site('https://other.example', b),
    ]);
    await wallet.removeAddress(a.address, a.type, a.brandName);

    expect(preferenceService.setCurrentAccount).toHaveBeenCalledWith(b);
    expect(removed.mock.calls).toEqual([['accountsChanged', []]]);
    expect(other).toHaveBeenCalledWith('accountsChanged', [b.address]);
  });

  test('preserves distinct keyring and brand bindings for the same address', async () => {
    await connectSessions([
      site('https://deleted.example', {
        ...a,
        address: a.address.toLowerCase(),
      }),
      site('https://watch.example', { ...a, type: 'Watch Address' }),
      site('https://hardware.example', { ...a, brandName: 'Ledger' }),
    ]);
    await wallet.removeAddress(a.address, a.type, a.brandName);
    expect(permissionService.hasPermission('https://deleted.example')).toBe(
      false
    );
    expect(permissionService.hasPermission('https://watch.example')).toBe(true);
    expect(permissionService.hasPermission('https://hardware.example')).toBe(
      true
    );
  });

  test.each([true, false])(
    'persists disconnection and permits explicit reconnection (previously connected: %s)',
    async (wasConnected) => {
      const [notify] = await connectSessions([
        site('https://dapp.example', a, wasConnected),
      ]);
      await wallet.removeAddress(a.address, a.type, a.brandName);
      jest
        .mocked(createPersistStore)
        .mockResolvedValue(permissionService.store);
      await permissionService.init();

      expect(notify.mock.calls).toEqual(
        wasConnected ? [['accountsChanged', []]] : []
      );
      await expect(query('https://dapp.example')).resolves.toEqual([]);
      expect(
        permissionService.getSite('https://dapp.example')?.account
      ).toBeUndefined();

      permissionService.addConnectedSiteV2({
        origin: 'https://dapp.example',
        name: 'Dapp',
        icon: '',
        defaultChain: 'ETH' as any,
        defaultAccount: b,
      });
      await expect(query('https://dapp.example')).resolves.toEqual([b.address]);
    }
  );
});
