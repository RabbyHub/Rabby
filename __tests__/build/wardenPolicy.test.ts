import fs from 'fs';
import path from 'path';

const { PolicyFiles } = require('warden-for-js/dist/plugin/policy-files');
const {
  normalizePluginOptions,
} = require('warden-for-js/dist/plugin/contracts');
const { WardenPlugin } = require('warden-for-js');

const root = path.resolve(__dirname, '../..');
const readJson = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const policy = readJson('SecSDK/policy.json');
const checks = readJson('SecSDK/check.json');
const overrides = readJson('SecSDK/policy-over.json');
const files = new PolicyFiles(root, normalizePluginOptions({ dev: false }));
const allowlist = files.readGlobalAllowlist();
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('Warden production policy', () => {
  it('requires global and dependency checks in production and debug builds', () => {
    for (const env of ['pro', 'debug']) {
      const config = require(`../../build/webpack.${env}.config.js`);
      const plugin = config.plugins.find(
        (item: unknown) => item instanceof WardenPlugin
      );
      expect(plugin.config).toMatchObject({
        dev: false,
        forceCheck: true,
        freezePrototypes: true,
        prototypeFreezeMode: 'compat',
        protectWebpackRequire: true,
      });
    }
    expect(allowlist).not.toBeNull();
    expect(() => files.checkGlobals(policy, allowlist)).not.toThrow();
    expect(() => files.checkPackageBoundaries(policy)).not.toThrow();
  });

  it('only approves exact package names, including nested package identities', () => {
    const exactNames = new Set(
      Object.keys(policy).map((name) => `^${escapeRegex(name)}$`)
    );
    for (const patterns of Object.values(checks) as string[][]) {
      for (const pattern of patterns)
        expect(exactNames.has(pattern)).toBe(true);
    }
  });

  it.each([
    'chrome',
    'browser',
    'document',
    'fetch',
    'WebSocket',
    'XMLHttpRequest',
    'localStorage',
    'indexedDB',
    'navigator',
    'postMessage',
    'addEventListener',
    'eval',
    'WebTransport',
    'unknownGlobal',
  ])('rejects unreviewed access to %s and package name spoofing', (name) => {
    for (const pkg of [
      'unreviewed-package',
      'webextension-polyfill-evil',
      'webextension-polyfill > unreviewed-package',
    ]) {
      expect(() =>
        files.checkGlobals(
          {
            [pkg]: { enable: true, global: { [name]: 'r' } },
          },
          allowlist
        )
      ).toThrow('Global access check failed');
    }
  });

  it('allows the extension API bridge and rejects third-party access to app code', () => {
    expect(() =>
      files.checkGlobals(
        {
          'webextension-polyfill': { enable: true, global: { chrome: 'r' } },
        },
        allowlist
      )
    ).not.toThrow();
    expect(() =>
      files.checkPackageBoundaries({
        'unreviewed-package': {
          enable: true,
          require: ['./src/background/index.ts'],
        },
      })
    ).toThrow('Third-party package boundary check failed');
  });

  it('denies network, DOM and extension access to cryptographic packages', () => {
    for (const pkg of [
      '@noble/hashes',
      '@metamask/browser-passworder',
      '@rabby-wallet/eth-simple-keyring',
      '@rabby-wallet/eth-hd-keyring',
    ]) {
      for (const name of [
        'fetch',
        'WebSocket',
        'XMLHttpRequest',
        'document',
        'chrome',
        'browser',
        'importScripts',
        'Worker',
        'Image',
        'EventTarget',
        'addEventListener',
        'postMessage',
        'localStorage',
        'navigator',
      ]) {
        expect(() =>
          files.checkGlobals(
            {
              [pkg]: { enable: true, global: { [name]: 'r' } },
            },
            allowlist
          )
        ).toThrow('Global access check failed');
      }
    }
  });

  it('keeps optional sensitive probes denied for otherwise approved packages', () => {
    const denied: Record<string, string[]> = {
      '@imkey/web3-provider': ['document', 'localStorage'],
      '@opensea/seaport-js > ethers': ['WebSocket'],
      'gridplus-sdk > ethers': ['WebSocket'],
      '@onekeyfe/hd-web-sdk': ['$$onekeyAppStorage'],
      '@rabby-wallet/rabby-swap': ['navigator'],
      jszip: [
        'document',
        'postMessage',
        'importScripts',
        'onmessage',
        'addEventListener',
      ],
      'util-deprecate': ['localStorage'],
    };
    for (const [pkg, names] of Object.entries(denied)) {
      expect(policy[pkg]?.enable).toBe(true);
      for (const name of names) {
        expect(policy[pkg]?.global?.[name]).toBeUndefined();
        expect(() =>
          files.checkGlobals(
            {
              [pkg]: { enable: true, global: { [name]: 'r' } },
            },
            allowlist
          )
        ).toThrow('Global access check failed');
      }
    }
  });

  it('keeps the native MessageEvent and Sentry receiver exceptions explicit', () => {
    for (const entries of [policy, overrides]) {
      expect(
        Object.entries(entries)
          .filter(([, value]: [string, any]) => value.enable === false)
          .map(([name]) => name)
      ).toEqual([
        '@metamask/post-message-stream',
        '@sentry/core',
        '@sentry/utils',
      ]);
      for (const entry of Object.values(entries) as any[]) {
        expect(entry.strict).not.toBe(false);
      }
    }
  });

  it('requires review when a read permission becomes writable', () => {
    // check.json approves package/global pairs but cannot distinguish r/rw.
    // Keep writes separately reviewed so an upgrade cannot silently escalate.
    const reviewed: Record<string, string[]> = {
      '@onekeyfe/hd-web-sdk': ['$onekey', '_', 'global'],
      '@rabby-wallet/page-provider': [
        'ethereum',
        'rabby',
        'rabbyWalletRouter',
        'web3',
      ],
      '@sentry/core': [
        '__SENTRY__',
        '_sentryWrappedDepth',
        'fetch',
        'onerror',
        'onunhandledrejection',
      ],
      '@sentry/utils': ['__SENTRY__'],
      '@walletconnect/core': ['downloadLogsBlobInBrowser'],
      classnames: ['classNames'],
      dexie: ['Promise'],
      ethers: ['_ethers'],
      fflate: ['onmessage'],
      'intersection-observer': [
        'IntersectionObserver',
        'IntersectionObserverEntry',
      ],
      jszip: ['clearImmediate', 'setImmediate'],
      lodash: ['_'],
      'lottie-web': ['bodymovin'],
      'react-router': ['__react_router_build__'],
      'regenerator-runtime': ['regeneratorRuntime'],
      'styled-components': ['__styled-components-init__'],
      tweetnacl: ['nacl'],
      zod: ['__zod_globalConfig', '__zod_globalRegistry'],
    };
    const writable: Record<string, string[]> = {};
    for (const [pkg, entry] of Object.entries(policy) as [string, any][]) {
      const names = Object.entries(entry.global || {})
        .filter(([, mode]) => mode === 'rw')
        .map(([name]) => name)
        .sort();
      if (names.length) writable[pkg] = names;
    }
    expect(writable).toEqual(reviewed);
  });
});
