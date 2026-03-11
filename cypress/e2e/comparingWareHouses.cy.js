/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openWarehousesList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingWareHousesTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfWareHouses', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openWarehousesList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openWarehousesList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });
});
