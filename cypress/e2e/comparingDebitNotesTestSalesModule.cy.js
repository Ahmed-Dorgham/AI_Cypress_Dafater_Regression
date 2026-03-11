/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openDebitNotesList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingDebitNotesTestSalesModule (Migrated from Selenium)', () => {
  it('TC01_comparingDebitNotesDataAtListView', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openDebitNotesList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openDebitNotesList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });

    cy.log('TODO: Migrate debit note totals/outstanding/paid amount parity checks.');
  });
});
