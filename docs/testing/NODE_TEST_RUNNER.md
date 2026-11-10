# Current unit test runner

The unit tests now use the built-in `node:test` runner and `node:assert` assertions instead of Vitest. This removes the source imports and configuration that triggered OnSpace's Vitest compatibility-metadata installation failure.

All existing core and migration test cases are retained. The unused browser setup (DOM assertions and module mocks) was removed because these suites exercise pure functions and do not render React components. The application, database, Vite configuration and package manifest are unchanged.

## Run in an exported project

Use Node.js 22 LTS or newer. From the repository root, install the project's application dependencies, then run:

```sh
npx --yes tsx --tsconfig tsconfig.json --test src/__tests__/*.test.ts
```

`tsx` loads TypeScript and resolves the existing `@/` path aliases. The runner returns a nonzero exit status on a failing assertion. This command runs locally; it does not deploy functions or modify the database.

The package manifest is managed by OnSpace and was not edited. If an existing npm test script references the previous runner, use the command above instead. Earlier ADR/testing documents describe the historical Vitest setup, not the current runner. Browser-component tests and coverage reporting are not provided by this replacement.

## Verification status

The test imports, assertions and configuration were updated. Automated test execution and an OnSpace rebuild could not be run with the available editing tools; they still need verification.
