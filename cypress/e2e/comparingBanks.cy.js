/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openBanksListV4,
  openBanksListV5,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingBanksTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfBanks', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openBanksListV4();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openBanksListV5();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });
});
