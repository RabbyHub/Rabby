import fs from 'fs';
import path from 'path';

// notification.ts instantiates a singleton at module load (constructor wires up
// browser/webextension-polyfill listeners) — mock its dependencies the same way
// notificationQueue.test.ts does so importing KNOWN_APPROVAL_KINDS doesn't throw.
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

/**
 * Grep-based regression guard for the approval-identity migration. This is
 * deliberately auxiliary (per the migration's own rules: static text search
 * can't prove "no unbound settlement exists", only catch textual reintroduction
 * of the specific deleted APIs / known-unsafe shapes) — real coverage is the
 * behavioral tests in notificationQueue.test.ts and useApprovalBinding.test.ts.
 */

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
      // These positional-arg APIs were removed in favor of resolveApprovalFor /
      // rejectApprovalFor; their names deliberately don't exist anymore, so any
      // reference is either a typo-survivor or a reintroduced compat shim.
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
    // Best-effort textual smell test for the specific forbidden pattern named in
    // the migration spec: fetching `current`/`approval` and building
    // `{ id: current.id, component: current.data.approvalComponent }` in the same
    // statement as a resolveApprovalFor/rejectApprovalFor call, outside the two
    // reviewed, explicitly-commented trusted-loading-boundary exceptions.
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
    // ApprovalKind is `keyof IApprovalComponents | 'Unlock'`, derived from this
    // barrel's exports at compile time. KNOWN_APPROVAL_KINDS is its hand-kept
    // runtime mirror (type-only imports erase at runtime, so it can't be derived
    // automatically) — if someone adds/renames/removes a component export without
    // updating the Set, a new approval type would fail closed (safe) but silently,
    // and this test is what would actually catch the mismatch.
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
    // Sanity check the parser itself found a realistic number of exports, so a
    // barrel refactor that changes export syntax fails loudly here instead of
    // silently passing with an empty set.
    expect(exportedNames.size).toBeGreaterThan(10);

    const knownKinds = new Set(KNOWN_APPROVAL_KINDS);
    // 'Unlock' is deliberately not part of the UI component barrel (see
    // notification.ts's ApprovalKind comment) — it's the one expected addition.
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
});
