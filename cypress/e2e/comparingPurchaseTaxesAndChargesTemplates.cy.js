/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openPurchaseTaxesTemplatesList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingPurchaseTaxesAndChargesTemplatesTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfPurchaseTaxesAndChargesTemplatesTet', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openPurchaseTaxesTemplatesList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openPurchaseTaxesTemplatesList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });
});
