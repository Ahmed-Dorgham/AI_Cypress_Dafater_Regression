/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openCreditNotesSalesList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingCreditNotesTestSalesModule (Migrated from Selenium)', () => {
  it('TC01_comparingCreditNotesDataAtListViewSalesModule', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openCreditNotesSalesList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openCreditNotesSalesList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });

    cy.log('TODO: migrate draft/total/outstanding/payment aggregates for full parity with Selenium TC01.');
  });

  it('TC02_comparingSpeceficCreditNoteDataSalesModule', () => {
    cy.log('TODO: Migrate detailed specific-credit-note parity checks (status, paid status, dates, totals, badge).');
  });
});
