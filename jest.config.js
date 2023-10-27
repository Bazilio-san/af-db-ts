module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
  ],
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  testRegex: [
    '__tests__.+\\.spec\\.ts',
  ],
  testPathIgnorePatterns: [
    '/.git/',
    '/.idea/',
    '/.run/',
    '/_misc/',
    '/_tmp/',
    '/coverage/',
    '/config/',
    '/dist/',
    '/node_modules/',
    '/src/',
  ],
  globals: { 'ts-jest': { tsconfig: 'tsconfig.json' } },
  // testSequencer: '<rootDir>/__tests__/test-sequencer.ts',
  globalSetup: '<rootDir>/__tests__/global-setup.ts',
  globalTeardown: '<rootDir>/__tests__/global-teardown.ts',
  testTimeout: 100_000,
};
