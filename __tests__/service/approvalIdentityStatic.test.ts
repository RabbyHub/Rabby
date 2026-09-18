import fs from 'fs';
import path from 'path';

// notification.ts's singleton wires up browser listeners at import time; mock its deps like notificationQueue.test.ts does.
jest.mock('webextension-polyfill', () => ({
  __esModule: true,
  default: {
    windows: { getAll: jest.fn().mockResolvedValue([]), update: jest.fn() },
    action: { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn() },
    browserAction: {
      setBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
    },
  },
}));
jest.mock('consts', () => ({
  KEYRING_CATEGORY_MAP: {},
  IS_LINUX: false,
  IS_VIVALDI: false,
  IS_CHROME: false,
  KEYRING_CATEGORY: {},
  IS_WINDOWS: false,
}));
jest.mock('background/webapi', () => ({
  winMgr: {
    event: { on: jest.fn() },
    openNotification: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('@/background/service/transactionHistory', () => ({
  __esModule: true,
  default: {
    addSigningTx: jest.fn(),
    getSigningTx: jest.fn(),
    removeSigningTx: jest.fn(),
    removeAllSigningTx: jest.fn(),
  },
}));
jest.mock('@/background/service/preference', () => ({
  __esModule: true,
  default: { getCurrentAccount: jest.fn() },
}));
jest.mock('@/stats', () => ({
  __esModule: true,
  default: { report: jest.fn() },
}));
jest.mock('@/utils/chain', () => ({ findChain: jest.fn() }));
jest.mock('@/utils/env', () => ({ isManifestV3: false }));
jest.mock('@sentry/browser', () => ({ captureException: jest.fn() }));

import { KNOWN_APPROVAL_KINDS } from '@/background/service/notification';

// Grep-based regression guard, auxiliary to the behavioral coverage in
// notificationQueue.test.ts/useApprovalBinding.test.ts — catches textual
// reintroduction of removed/unsafe shapes, not "no unbound settlement exists".

const SRC_ROOT = path.join(__dirname, '../../src');

function listFiles(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, out);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith('.d.ts')
    ) {
      out.push(full);
    }
  }
  return out;
}

const files = listFiles(SRC_ROOT);
const read = (f: string) => fs.readFileSync(f, 'utf8');

describe('approval identity static constraints', () => {
  test('the deleted unbound background APIs are never referenced again', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = read(file);
      // Removed in favor of resolveApprovalFor/rejectApprovalFor; any reference here is a reintroduced compat shim.
      if (
        /\bnotificationService\.resolveApproval\s*\(/.test(content) ||
        /\bnotificationService\.rejectApproval\s*\(/.test(content) ||
        /\bwallet\.resolveApproval\s*\(/.test(content) ||
        /\bwallet\.rejectApproval\s*\(/.test(content)
      ) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  test('every useApproval( call site passes an explicit argument (no implicit unbound fallback)', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = read(file);
      // useApproval() / useApproval( ) with nothing before the close-paren.
      const matches = content.match(/useApproval\(\s*\)/g);
      if (matches) {
        offenders.push(`${path.relative(SRC_ROOT, file)} (${matches.length})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('resolveApprovalFor/rejectApprovalFor call sites are not passed a bare currentApproval-derived ref inline', () => {
    // Flags an inline `{ id: current.id, component: current.data.approvalComponent }`
    // next to a resolveApprovalFor/rejectApprovalFor call, outside the two reviewed
    // trusted-loading-boundary exceptions.
    const allowedFiles = new Set([
      path.join(SRC_ROOT, 'ui/views/Approval/index.tsx'),
      path.join(SRC_ROOT, 'background/service/notification.ts'),
    ]);
    const offenders: string[] = [];
    for (const file of files) {
      if (allowedFiles.has(file)) continue;
      const content = read(file);
      const hasInlineCurrentRef = /(resolveApprovalFor|rejectApprovalFor)\s*\(\s*\{\s*approval:\s*\{\s*id:\s*(current|approval)\.id/.test(
        content
      );
      if (hasInlineCurrentRef) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  test('KNOWN_APPROVAL_KINDS stays in sync with the Approval/components barrel', () => {
    // KNOWN_APPROVAL_KINDS is a hand-kept runtime mirror of ApprovalKind (a type,
    // erased at runtime) — catches it drifting from the barrel.
    const barrelPath = path.join(
      SRC_ROOT,
      'ui/views/Approval/components/index.ts'
    );
    const barrelSource = read(barrelPath);
    const exportedNames = new Set<string>();
    const exportPattern = /export\s*\{\s*(?:default as )?(\w+)\s*\}\s*from/g;
    let match: RegExpExecArray | null;
    while ((match = exportPattern.exec(barrelSource))) {
      exportedNames.add(match[1]);
    }
    // Guards the parser itself: an export-syntax change should fail loudly here, not pass silently with an empty set.
    expect(exportedNames.size).toBeGreaterThan(10);

    const knownKinds = new Set(KNOWN_APPROVAL_KINDS);
    // 'Unlock' isn't in the UI barrel (see notification.ts) — the one expected addition.
    knownKinds.delete('Unlock');

    const missingFromKnownKinds = [...exportedNames].filter(
      (name) => !knownKinds.has(name as any)
    );
    const extraInKnownKinds = [...knownKinds].filter(
      (name) => !exportedNames.has(name)
    );

    expect({ missingFromKnownKinds, extraInKnownKinds }).toEqual({
      missingFromKnownKinds: [],
      extraInKnownKinds: [],
    });
  });

  test('each barrel-registered component binds the approvalComponent literal matching its own barrel key', () => {
    // Each component hardcodes its own expected type in bindApproval() rather than
    // deriving it (deriving from currentApproval would make the background's
    // mismatch check tautological). Catches a copy-paste/rename mismatch here
    // instead of a silent no-op in the field.
    const componentsDir = path.join(SRC_ROOT, 'ui/views/Approval/components');
    const barrelSource = read(path.join(componentsDir, 'index.ts'));
    const entryPattern = /export\s*\{\s*(?:default as )?(\w+)\s*\}\s*from\s*'\.\/([^']+)'/g;
    const entries: { key: string; importPath: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = entryPattern.exec(barrelSource))) {
      entries.push({ key: m[1], importPath: m[2] });
    }
    expect(entries.length).toBeGreaterThan(10);

    const resolveFile = (relativeImportPath: string): string | null => {
      const base = path.join(componentsDir, relativeImportPath);
      for (const candidate of [
        `${base}.tsx`,
        `${base}.ts`,
        path.join(base, 'index.tsx'),
        path.join(base, 'index.ts'),
      ]) {
        if (fs.existsSync(candidate)) return candidate;
      }
      return null;
    };

    const bindApprovalLiteral = (source: string): string | null => {
      const bindMatch = /bindApproval\(\s*[^,]*,\s*'(\w+)'/.exec(source);
      return bindMatch ? bindMatch[1] : null;
    };

    // Pure local re-exports (e.g. QRHardWareWaiting/index.tsx) forward to the file that actually binds.
    const localReexportTarget = (
      source: string,
      fileDir: string
    ): string | null => {
      const reexport = /import\s+\w+\s+from\s+'\.\/([^']+)'/.exec(source);
      if (!reexport) return null;
      return resolveFile(
        path.join(path.relative(componentsDir, fileDir), reexport[1])
      );
    };

    const mismatches: string[] = [];
    const uncheckable: string[] = [];

    for (const { key, importPath } of entries) {
      let file = resolveFile(importPath);
      if (!file) {
        uncheckable.push(`${key}: could not resolve ./${importPath}`);
        continue;
      }
      let source = read(file);
      let literal = bindApprovalLiteral(source);
      if (literal === null) {
        const forwarded = localReexportTarget(source, path.dirname(file));
        if (forwarded) {
          file = forwarded;
          source = read(file);
          literal = bindApprovalLiteral(source);
        }
      }
      if (literal === null) {
        // No reachable bindApproval (e.g. ImportAddress.tsx just redirects) — nothing to check.
        continue;
      }
      if (literal !== key) {
        mismatches.push(
          `barrel key '${key}' (./${importPath}) resolves to a component ` +
            `binding as '${literal}' in ${path.relative(SRC_ROOT, file)}`
        );
      }
    }

    expect({ mismatches, uncheckable }).toEqual({
      mismatches: [],
      uncheckable: [],
    });
  });

  test('waiting-page components settle their bound approval before closing the CommonPopup', () => {
    // closePopup() unmounts these (CommonPopup's Approval branch), flipping the
    // mounted ref isOwnedByThisView checks post-await — it must only run inside
    // resolveApproval's own .then(), never before it.
    const componentsDir = path.join(SRC_ROOT, 'ui/views/Approval/components');
    const waitingFiles = [
      'LedgerHardwareWaiting.tsx',
      'CommonWaiting.tsx',
      'PrivatekeyWaiting.tsx',
      'QRHardWareWaiting/QRHardWareWaiting.tsx',
      'WatchAddressWaiting/index.tsx',
      'CoinbaseWaiting/index.tsx',
      'ImKeyHardwareWaiting.tsx',
    ];
    const offenders: string[] = [];
    for (const relPath of waitingFiles) {
      const source = read(path.join(componentsDir, relPath));
      const settlesBeforeClose = /resolveApproval\([^)]*\)\.then\(\(\) => \{\s*closePopup\(\);/.test(
        source
      );
      const closesBeforeSettle = /closePopup\(\);\s*\n\s*resolveApproval\(/.test(
        source
      );
      if (!settlesBeforeClose || closesBeforeSettle) {
        offenders.push(relPath);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('ConnectContent awaits resolveApproval before the callback that unmounts it', () => {
    // Same race as above: onPerpsInvite() unmounts this component, so it must
    // fire only after resolveApproval's own async chain finishes.
    const source = read(
      path.join(
        SRC_ROOT,
        'ui/views/Approval/components/Connect/ConnectContent.tsx'
      )
    );
    const awaitsBeforeInvite = /await resolveApproval\(\s*\{\s*defaultChain,\s*defaultAccount:\s*selectedAccount,\s*\},\s*stay\s*\);\s*\n\s*if \(stay\) \{\s*onPerpsInvite/.test(
      source
    );
    expect(awaitsBeforeInvite).toBe(true);
  });
});
