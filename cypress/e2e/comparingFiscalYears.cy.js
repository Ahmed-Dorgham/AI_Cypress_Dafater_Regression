/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openFiscalYearsList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingFiscalYearsTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfFiscalYears', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openFiscalYearsList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openFiscalYearsList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });
});
