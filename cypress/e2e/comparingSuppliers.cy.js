/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openSuppliersList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingSuppliersTest (Migrated from Selenium)', () => {
  it('TC01_comparingSuppliersDataAtListView', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openSuppliersList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openSuppliersList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });

    cy.log('TODO: Migrate supplier prepayment financial parity computation from purchase invoices outstanding totals.');
  });
});
