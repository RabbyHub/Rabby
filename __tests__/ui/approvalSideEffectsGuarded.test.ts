import fs from 'fs';
import path from 'path';
import ts from 'typescript';

// Approval pages fail closed on the resolve, but nothing stops a handler from
// doing something irreversible on its way there: starting a signer, writing
// another approval's signing record, switching accounts, posting to a Safe.
// Every one of those has to be gated on the approval the page is bound to.
//
// This is a presence check, not an ordering one: a function that calls
// something on this list must also call `isBound`. Whether the guard sits
// before the effect is a judgement the reader still has to make - but a new
// unguarded call site cannot land silently.
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
  'coboSafeImport',
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

const calledNames = (node: ts.Node) => {
  const names = new Set<string>();
  const visit = (n: ts.Node) => {
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      if (ts.isIdentifier(callee)) names.add(callee.text);
      if (ts.isPropertyAccessExpression(callee)) names.add(callee.name.text);
    }
    ts.forEachChild(n, visit);
  };
  visit(node);
  return names;
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

      const visit = (node: ts.Node) => {
        if (
          ts.isFunctionDeclaration(node) ||
          ts.isFunctionExpression(node) ||
          ts.isArrowFunction(node) ||
          ts.isMethodDeclaration(node)
        ) {
          const names = calledNames(node);
          const effects = IRREVERSIBLE.filter((name) => names.has(name));
          if (effects.length && !names.has('isBound')) {
            const { line } = source.getLineAndCharacterOfPosition(
              node.getStart()
            );
            unguarded.push(
              `${path.relative(ROOT, file)}:${line + 1} → ${effects.join(', ')}`
            );
            return; // report the outermost function only
          }
        }
        ts.forEachChild(node, visit);
      };

      ts.forEachChild(source, visit);
    }

    expect(unguarded).toEqual([]);
  });
});
