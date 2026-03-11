/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openSalesOrdersList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingSalesOrdersTestSalesModule (Migrated from Selenium)', () => {
  it('TC01_comparingSalesOrdersDataAtListViewSalesModule', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openSalesOrdersList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openSalesOrdersList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });

  it('TC02_comparingSpeceficCreditNoteDataSalesModule', () => {
    cy.log('TODO: Selenium source has this flow disabled/commented; migrate only if you want it active in Cypress.');
  });
});
