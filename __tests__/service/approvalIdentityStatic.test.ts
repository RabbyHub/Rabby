import fs from 'fs';
import path from 'path';

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
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
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
      const hasInlineCurrentRef =
        /(resolveApprovalFor|rejectApprovalFor)\s*\(\s*\{\s*approval:\s*\{\s*id:\s*(current|approval)\.id/.test(
          content
        );
      if (hasInlineCurrentRef) {
        offenders.push(path.relative(SRC_ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });
});
