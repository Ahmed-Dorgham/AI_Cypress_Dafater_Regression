/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openCreditNotesPurchaseList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingCreditNotesTestPurchaseModule (Migrated from Selenium)', () => {
  it('TC01_comparingCreditNotesDataAtListViewPurchaseModule', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openCreditNotesPurchaseList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openCreditNotesPurchaseList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });

    cy.log('TODO: migrate draft/total/outstanding/paid aggregate checks for full parity with Selenium TC01.');
  });

  it('TC02_comparingCreditNoteDataPurchaseModule', () => {
    cy.log('TODO: Migrate detailed specific-credit-note parity checks (status, paid status, dates, totals, badge).');
  });
});
