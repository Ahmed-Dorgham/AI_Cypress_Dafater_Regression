# Cypress_DataMigrationProject

Standalone Cypress migration project generated from Selenium TestNG suite in `src/test/java/TestCases`.

## Run
1. `npm install`
2. `npm run cypress:open` or `npm run cypress:run`

## Notes
- Each Selenium test class has a matching Cypress spec under `cypress/e2e`.
- `addingItems.cy.js` is fully migrated implementation.
- Other generated specs include TODO placeholders per original test method and should be implemented incrementally.

- Several Comparing* suites are migrated (count-first): they validate record-count parity across v4 and v5 and include TODO markers for advanced amount/detail parity.

