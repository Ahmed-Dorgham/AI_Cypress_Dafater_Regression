/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openStockEntriesList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingStockEntryTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfStockEntries', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openStockEntriesList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openStockEntriesList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });
});
