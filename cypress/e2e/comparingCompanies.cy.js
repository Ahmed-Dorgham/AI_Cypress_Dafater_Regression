/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openCompaniesListV4,
  openCompaniesListV5,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingCompaniesTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfCompanies', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openCompaniesListV4();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openCompaniesListV5();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });
});
