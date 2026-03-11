/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openPurchaseReceiptsList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingPurchaseReceiptsTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfPurchaseReceipt', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openPurchaseReceiptsList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openPurchaseReceiptsList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });
});
