/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openSalesTaxesTemplatesList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingSalesTaxesAndChargesTemplatesTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfSalesTaxesAndChargesTemplatesTet', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openSalesTaxesTemplatesList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openSalesTaxesTemplatesList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });
});
