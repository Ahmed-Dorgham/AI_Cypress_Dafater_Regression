/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openPaymentEntryList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingPaymentEntryTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfPaymentEntry', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openPaymentEntryList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openPaymentEntryList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });
});
