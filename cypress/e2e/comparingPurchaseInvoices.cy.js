/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openPurchaseInvoicesList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingPurchaseInvoicesTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfPurchaseInvoices', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openPurchaseInvoicesList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openPurchaseInvoicesList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });

    cy.log('TODO: Migrate full TC01 totals/outstanding/payment parity checks.');
  });

  it('TC02_comparingPurchaseInvoiceDates', () => {
    cy.log('TODO: Migrate specific purchase invoice date parity check.');
  });
});
