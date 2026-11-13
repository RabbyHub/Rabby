// Dependencies often carry their own nested install of a package that is
// byte-for-byte the same as another install (31 copies of bn.js 5.2.3, for
// example), and webpack bundles each copy it reaches. This plugin points every
// such copy at one canonical install, so identical code is bundled once. No
// version changes. It only touches the packages it is given, only installs
// with no dependencies of their own (so nothing resolves differently from the
// canonical location), and only installs whose files hash the same as the
// canonical one.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const pluginName = 'DedupeIdenticalPackagesPlugin';

function hashPackage(root) {
  const hash = crypto.createHash('sha256');
  (function walk(dir) {
    const entries = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.name !== 'node_modules')
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        hash.update(path.relative(root, full));
        hash.update(fs.readFileSync(full));
      }
    }
  })(root);
  return hash.digest('hex');
}

// every install of the given package names under node_modules, by name@version
function findInstalls(nodeModules, names) {
  const installs = new Map();
  (function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.name.startsWith('@')) {
        walk(full);
        continue;
      }
      try {
        const pkg = JSON.parse(
          fs.readFileSync(path.join(full, 'package.json'), 'utf8')
        );
        if (names.includes(pkg.name)) {
          const key = `${pkg.name}@${pkg.version}`;
          if (!installs.has(key)) installs.set(key, []);
          installs.get(key).push({ root: full, pkg });
        }
      } catch {
        // not a package directory
      }
      walk(path.join(full, 'node_modules'));
    }
  })(nodeModules);
  return installs;
}

class DedupeIdenticalPackagesPlugin {
  constructor({ nodeModules, packages }) {
    this.nodeModules = nodeModules;
    this.packages = packages;
  }

  // install root -> canonical install root
  buildRedirects() {
    const redirects = new Map();
    for (const copies of findInstalls(
      this.nodeModules,
      this.packages
    ).values()) {
      const leaves = copies.filter(
        ({ pkg }) =>
          !Object.keys(pkg.dependencies || {}).length &&
          !Object.keys(pkg.peerDependencies || {}).length
      );
      if (leaves.length < 2) continue;
      // shortest path first, so the canonical copy is stable across builds
      leaves.sort(
        (a, b) => a.root.length - b.root.length || a.root.localeCompare(b.root)
      );
      const [canonical, ...rest] = leaves;
      const canonicalHash = hashPackage(canonical.root);
      for (const { root } of rest) {
        if (hashPackage(root) === canonicalHash) {
          redirects.set(root, canonical.root);
        }
      }
    }
    return redirects;
  }

  apply(compiler) {
    const redirects = this.buildRedirects();
    const sep = path.sep;
    const nodeModulesSegment = `${sep}node_modules${sep}`;

    const packageRootOf = (resource) => {
      const index = resource.lastIndexOf(nodeModulesSegment);
      if (index === -1) return null;
      const rest = resource.slice(index + nodeModulesSegment.length).split(sep);
      const depth = rest[0].startsWith('@') ? 2 : 1;
      return (
        resource.slice(0, index + nodeModulesSegment.length) +
        rest.slice(0, depth).join(sep)
      );
    };

    compiler.hooks.normalModuleFactory.tap(pluginName, (factory) => {
      factory.hooks.afterResolve.tap(pluginName, ({ createData }) => {
        if (typeof createData.resource !== 'string') return;
        const from = packageRootOf(createData.resource);
        const to = from && redirects.get(from);
        if (!to) return;
        const swap = (value) => {
          if (typeof value !== 'string') return value;
          if (value === from) return to;
          return value.split(from + sep).join(to + sep);
        };
        createData.resource = swap(createData.resource);
        createData.request = swap(createData.request);
        createData.userRequest = swap(createData.userRequest);
        createData.context = swap(createData.context);
        const resolved = createData.resourceResolveData;
        if (resolved) {
          createData.resourceResolveData = {
            ...resolved,
            path: swap(resolved.path),
            descriptionFilePath: swap(resolved.descriptionFilePath),
            descriptionFileRoot: swap(resolved.descriptionFileRoot),
          };
        }
      });
    });
  }
}

module.exports = DedupeIdenticalPackagesPlugin;
