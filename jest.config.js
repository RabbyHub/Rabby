const IGNORE_MODULES = [
  '@debank',
  '@rabby-wallet',
  'p-',
  '@keystonehq',
  '@walletconnect',
  'uint8arrays',
  'multiformats',
  'nanoid',
  'uuid',
  '@ethereumjs',
  'dom-align',
].join('|');

// ts-jest only transpiles; `yarn typecheck` (whose tsconfig includes __tests__)
// does the type checking. Type-checking here ran a TypeScript language service
// in every worker (~5GB each) and keyed the cache on import mtimes, so a cold
// run took over 10 minutes. An object `tsconfig` is merged over tsconfig.json.
// Per-file transpiling can't pair CommonJS output with "bundler" resolution.
const tsJest = (compilerOptions = {}) => [
  'ts-jest',
  {
    tsconfig: {
      ...compilerOptions,
      module: 'commonjs',
      moduleResolution: 'node',
    },
    isolatedModules: true,
    useESM: true,
  },
];

/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/en/configuration.html
 */
module.exports = {
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^utils/(.*)$': '<rootDir>/src/utils/$1',
    '^utils': '<rootDir>/src/utils',
    '^consts/(.*)$': '<rootDir>/src/constant/$1',
    '^consts': '<rootDir>/src/constant',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^ui/(.*)$': '<rootDir>/src/ui/$1',
    '^background/(.*)$': '<rootDir>/src/background/$1',
    '^@rabby-wallet/rabby-bridge$':
      '<rootDir>/node_modules/@rabby-wallet/rabby-bridge/dist/index.js',
    '^@rabby-wallet/staking-sdk$':
      '<rootDir>/node_modules/@rabby-wallet/staking-sdk/dist/index.js',
  },

  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>/__tests__'],

  // The paths to modules that run some code to configure or set up the testing environment before each test
  setupFiles: ['<rootDir>/__tests__/setupTests.ts'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setupTestsAfterEnv.ts'],

  // The test environment that will be used for testing
  testEnvironment: 'jest-environment-jsdom',

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/*.test.ts'],

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [`<rootDir>/node_modules/(?!${IGNORE_MODULES})`],

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.tsx$': tsJest({ jsx: 'react' }),
    '^.+\\.[tj]s$': tsJest(),
    '^.+\\.(svg|png|jpg)$': '<rootDir>/svgTransform.js',
  },
};
