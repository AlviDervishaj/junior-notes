/**
 * Two projects because the layers have different needs:
 *  - `logic`  runs in a real Node environment so db/ tests can use node:sqlite
 *  - `native` uses jest-expo so components render under React Native
 *
 * Note the moduleNameMapper order: `^@/assets/` must precede the generic
 * `^@/` rule, otherwise the generic rule swallows asset paths.
 */
const moduleNameMapper = {
  '^@/assets/(.*)$': '<rootDir>/assets/$1',
  '^@/(.*)$': '<rootDir>/src/$1',
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'logic',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/lib/**/*.test.ts',
        '<rootDir>/src/db/**/*.test.ts',
        '<rootDir>/src/theme/**/*.test.ts',
      ],
      transform: {
        '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
      },
      moduleNameMapper,
    },
    {
      displayName: 'native',
      preset: 'jest-expo',
      // Screen tests live in tests/screens, NOT src/app: expo-router turns
      // every file under src/app into a navigable route, test files included.
      testMatch: [
        '<rootDir>/src/components/**/*.test.tsx',
        '<rootDir>/src/hooks/**/*.test.tsx',
        '<rootDir>/src/lib/**/*.test.tsx',
        '<rootDir>/src/theme/**/*.test.tsx',
        '<rootDir>/tests/screens/**/*.test.tsx',
      ],
      moduleNameMapper,
      setupFilesAfterEnv: ['<rootDir>/tests/setup-native.ts'],
    },
  ],
};
