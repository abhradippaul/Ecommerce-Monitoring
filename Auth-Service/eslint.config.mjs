// eslint.config.mjs
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Ignore patterns
  {
    ignores: ['node_modules/', 'dist/', 'coverage/', 'build/', '**/*.js', '**/*.mjs', '**/*.cjs'],
  },

  // Base TS configurations
  ...tseslint.configs.recommended,

  // Global settings for all TS files
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^(req|res|next|_)',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // Production code - stricter rules
  {
    files: ['src/**/*.ts'],
    rules: {
      complexity: ['error', 15],
      'max-depth': ['error', 4],
      'max-lines-per-function': ['warn', 120],
      'no-console': 'error',
    },
  },

  // Test files - more lenient rules
  {
    files: ['test/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      'max-lines-per-function': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  }
);
