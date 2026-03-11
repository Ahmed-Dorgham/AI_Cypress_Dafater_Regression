/// <reference types="cypress" />

import { getMigrationEnv, login, openWarehousesList, clickNewPrimaryAction, readTotalRowsCount, waitForOverlay } from '../support/migrationHelpers';

describe('AddingWareHouseTest (Migrated from Selenium)', () => {
  it('TC01_createNewWareHouse', () => {
    const env = getMigrationEnv();
    const wareHouseName = `wareHouse ${Date.now()}`;

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openWarehousesList();
    readTotalRowsCount().as('beforeCount');

    clickNewPrimaryAction();
    waitForOverlay();
    cy.get('input[data-fieldname="warehouse_name"], #warehouse_name', { timeout: 120000 }).first().clear({ force: true }).type(wareHouseName, { force: true });
    cy.get('[data-action_name="Save"], #appframe-btn-حفظ, #appframe-btn-save', { timeout: 120000 }).first().click({ force: true });
    waitForOverlay();

    openWarehousesList();
    cy.contains('a[data-doctype="Warehouse"]', wareHouseName, { timeout: 120000 }).should('be.visible');
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').then((afterCount) => {
        expect(afterCount).to.be.greaterThan(beforeCount);
      });
    });
  });
});
