/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openCustomersList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingCustomersTest (Migrated from Selenium)', () => {
  it('TC01_comparingCustomersDataAtListView', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openCustomersList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openCustomersList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });

    cy.log('TODO: Migrate outstanding/prepayment financial parity computation from sales invoices and credit notes.');
  });
});
