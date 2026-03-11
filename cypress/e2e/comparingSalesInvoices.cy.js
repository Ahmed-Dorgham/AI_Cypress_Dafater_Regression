/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openSalesInvoicesList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingSalesInvoicesTest (Migrated from Selenium)', () => {
  it('TC01_comparingSalesInvoicesAtViewList', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openSalesInvoicesList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openSalesInvoicesList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });

    cy.log('TODO: Migrate full TC01 totals (sum and payment metrics) parity checks.');
  });

  it('TC02_comparingSalesInvoiceData', () => {
    cy.log('TODO: Migrate specific sales invoice field-level parity (search and compare).');
  });

  it('TC03_comparingSalesInvoiceDataAtGL', () => {
    cy.log('TODO: Migrate GL parity validation for selected sales invoice.');
  });
});
