/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  createItem,
  addItemPriceStandardSelling,
  openSalesInvoicesList,
  clickNewPrimaryAction,
  waitForOverlay,
} from '../support/migrationHelpers';

describe('PosViewTest (Migrated from Selenium)', () => {
  it('TC01_createNewSalesInvoiceUsingPosView', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);

    openSalesInvoicesList();
    clickNewPrimaryAction();
    waitForOverlay();

    cy.contains('button', 'واجهة نقاط البيع', { timeout: 120000 }).click({ force: true });
    waitForOverlay();

    cy.get('input.input-with-feedback.form-control[data-fieldtype="Data"]', { timeout: 120000 }).first().type(itemCode, { force: true });
    cy.contains('div', itemCode, { timeout: 120000 }).first().click({ force: true });

    cy.get('.checkout-btn, .submit-order-btn', { timeout: 120000 }).first().click({ force: true });
    cy.get('.submit-order-btn', { timeout: 120000 }).click({ force: true });
    cy.get('.btn.btn-primary.btn-sm.btn-modal-primary', { timeout: 120000 }).first().click({ force: true });

    cy.get('.invoice-name, .label-success', { timeout: 120000 }).should('be.visible');
  });

  it('TC02_applyDiscountOnSalesInvoiceUsingPosView', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);

    openSalesInvoicesList();
    clickNewPrimaryAction();
    waitForOverlay();
    cy.contains('button', 'واجهة نقاط البيع', { timeout: 120000 }).click({ force: true });

    cy.get('input.input-with-feedback.form-control[data-fieldtype="Data"]', { timeout: 120000 }).first().type(itemCode, { force: true });
    cy.contains('div', itemCode, { timeout: 120000 }).first().click({ force: true });

    cy.get('.add-discount-wrapper', { timeout: 120000 }).click({ force: true });
    cy.get('.add-discount-wrapper input', { timeout: 120000 }).first().clear({ force: true }).type('10', { force: true });

    cy.get('.net-total-container span', { timeout: 120000 }).should('exist');
    cy.get('.checkout-btn', { timeout: 120000 }).click({ force: true });
    cy.get('.submit-order-btn', { timeout: 120000 }).click({ force: true });
    cy.get('.btn.btn-primary.btn-sm.btn-modal-primary', { timeout: 120000 }).first().click({ force: true });
  });
});
