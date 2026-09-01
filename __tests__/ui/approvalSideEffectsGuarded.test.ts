import fs from 'fs';
import path from 'path';
import ts from 'typescript';

// Approval pages fail closed on the resolve, but nothing stops a handler from
// doing something irreversible on its way there: starting a signer, writing
// another approval's signing record, switching accounts, posting to a Safe.
// Every one of those has to be gated on the approval the page is bound to.
//
// A function that calls something on this list must call `isBound` first. The
// check is textual position within the function, which is enough to catch a
// guard that sits after the effect, and it is all this can honestly do.
//
// Known holes, so nobody over-trusts a green run: an effect reached through a
// helper in another file, a call through a variable or a computed member name,
// and anything outside `src/ui/views/Approval/components`. It narrows the
// surface, it does not close it.
const IRREVERSIBLE = [
  'updateSigningTx',
  'resendSign',
  'emitSignComponentAmounted',
  'submitQRHardwareSignature',
  'buildGnosisTransaction',
  'buildGnosisMessage',
  'signTypedDataWithUI',
  'sendRequest',
  'gnosisAddSignature',
  'gnosisAddConfirmation',
  'postGnosisTransaction',
  'handleGnosisMessage',
  'coboSafeBuildTransaction',
  'addCustomTestnet',
  'updateConnectSite',
];

const ROOT = path.join(__dirname, '../../src/ui/views/Approval/components');

const sources = () => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // the in-page mini signer has no approval to bind to by design
        if (/^Mini/.test(entry.name)) continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(ROOT);
  return out;
};

const isFunctionLike = (n: ts.Node) =>
  ts.isFunctionDeclaration(n) ||
  ts.isFunctionExpression(n) ||
  ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n);

// First position at which each name is called in this function's *own* scope.
// Nested functions are visited on their own; counting their calls here would
// let a guard inside one callback vouch for an effect in a sibling.
const callPositions = (node: ts.Node) => {
  const at = new Map<string, number>();
  const seen = (name: string, pos: number) => {
    if (!at.has(name) || pos < at.get(name)!) at.set(name, pos);
  };
  const visit = (n: ts.Node) => {
    if (n !== node && isFunctionLike(n)) return;
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      if (ts.isIdentifier(callee)) seen(callee.text, n.getStart());
      if (ts.isPropertyAccessExpression(callee))
        seen(callee.name.text, n.getStart());
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return at;
};

describe('irreversible approval side effects are gated on the bound approval', () => {
  it('has no unguarded call site', () => {
    const unguarded: string[] = [];

    for (const file of sources()) {
      const text = fs.readFileSync(file, 'utf8');
      if (!IRREVERSIBLE.some((name) => text.includes(name))) continue;

      const source = ts.createSourceFile(
        file,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      // A handler that deliberately acts on an approval it creates itself has
      // to say so, in writing, on the lines just above that call - not
      // anywhere in the function, or one marker would excuse the whole file.
      const EXEMPT = 'approval-side-effect-ok:';
      const lines = text.split('\n');
      const exemptedAt = (pos: number) => {
        const { line } = source.getLineAndCharacterOfPosition(pos);
        return lines
          .slice(Math.max(0, line - 4), line)
          .some((l) => l.includes(EXEMPT));
      };

      const visit = (node: ts.Node) => {
        if (
          ts.isFunctionDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node) ||
          ts.isMethodDeclaration(node)
        ) {
          const at = callPositions(node);
          const guard = at.get('isBound');
          const effects = IRREVERSIBLE.filter(
            (name) =>
              at.has(name) &&
              (guard === undefined || guard > at.get(name)!) &&
              !exemptedAt(at.get(name)!)
          );
          if (effects.length) {
            const { line } = source.getLineAndCharacterOfPosition(
              node.getStart()
            );
            unguarded.push(
              `${path.relative(ROOT, file)}:${line + 1} → ${effects.join(', ')}`
            );
            // keep descending: a nested handler is judged on its own scope
          }
        }
        ts.forEachChild(node, visit);
      };

      ts.forEachChild(source, visit);
    }

    expect(unguarded).toEqual([]);
  });
});
