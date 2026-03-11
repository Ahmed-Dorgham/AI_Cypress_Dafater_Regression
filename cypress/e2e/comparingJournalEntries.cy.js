/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openJournalEntriesList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingJournalEntriesTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfJournalEntries', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openJournalEntriesList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openJournalEntriesList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });
});
