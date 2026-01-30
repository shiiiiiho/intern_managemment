// Jest設定
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.spec.js', '**/__tests__/**/*.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/archive/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/playwright-report/**',
    '!jest.config.cjs',
    '!playwright.config.cjs',
    '!commitlint.config.cjs',
    '!eslint.config.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },
  testTimeout: 10000,
  verbose: true,
  testPathIgnorePatterns: ['/node_modules/', '/archive/', '/tests/e2e/'],
  clearMocks: true
};
