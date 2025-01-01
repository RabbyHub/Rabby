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
].join('|');
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
  },

  // A list of paths to directories that Jest should use to search for files in
  roots: ['<rootDir>/__tests__'],

  // The paths to modules that run some code to configure or set up the testing environment before each test
  setupFiles: ['<rootDir>/__tests__/setupTests.ts'],

  // The test environment that will be used for testing
  testEnvironment: 'jest-environment-jsdom',

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/*.test.ts'],

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [`<rootDir>/node_modules/(?!${IGNORE_MODULES})`],

  // A map from regular expressions to paths to transformers
  transform: {
    '^.+\\.[tj]s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: true,
      },
    ],
    '^.+\\.(svg|png|jpg)$': '<rootDir>/svgTransform.js',
  },
};
