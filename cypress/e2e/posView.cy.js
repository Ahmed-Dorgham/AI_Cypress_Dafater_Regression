/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  createItem,
  addItemPriceStandardSelling,
  openSalesInvoicesList,
  openPurchaseReceiptsList,
  clickNewPrimaryAction,
  waitForOverlay,
  selectPurchaseReceiptSupplier,
  selectPurchaseReceiptItem,
  saveAndSubmitPurchaseReceipt,
} from '../support/migrationHelpers';
const rawBase =
  Cypress.config('baseUrl') ||
  Cypress.env('DAFATER_BASE_URL') ||
  (Cypress.env('scope') === 'Regression'
    ? 'https://temp-qc-tmp.dafater.biz'
    : 'https://temp-qc-tmp.dafater.biz');

const origin = (() => {
  try {
    return new URL(rawBase).origin;
  } catch (e) {
    return rawBase.split('#')[0].replace(/\/$/, '').split('/app')[0];
  }
})();

const baseUrl = origin;

const scope = Cypress.env('scope') || 'Regression'; // Mirrors TestNG Scope param
const creds = {
  username: Cypress.env('DAFATER_USER') || 'Administrator',
  password:
    Cypress.env('DAFATER_PASS') ||
    (scope === 'Regression' ? 'AsDedpoEweWwerd' : 'AsDedpoEweWwerd'),
};

const ITEM_PRICE = Cypress.env('DAFATER_ITEM_PRICE') || '100';
const OVERLAY = '.freeze-message-container';
const LONG_TIMEOUT = 200000;


describe('PosViewTest (Migrated from Selenium)', () => {
  it('TC01_createNewSalesInvoiceUsingPosView', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);

 openPurchaseReceiptsList();
    clickNewPrimaryAction();
    waitForOverlay();
    selectPurchaseReceiptSupplier();
    selectPurchaseReceiptItem(itemCode);
    saveAndSubmitPurchaseReceipt();

    cy.get('span.label.label-success:visible', { timeout: 120000 })
      .first()
      .invoke('text')
      .then((statusText) => {
        const actualStatus = String(statusText).replace(/\s+/g, ' ').trim();
        cy.log(`Purchase Receipt status value: ${actualStatus}`);
        expect(actualStatus).to.contain('معتمد');
      });



    openSalesInvoicesList();
    clickNewPrimaryAction();
    waitForOverlay();

    cy.contains('button', 'واجهة نقاط البيع', { timeout: 120000 }).click({ force: true });
    waitForOverlay();

    cy.get('input.input-with-feedback.form-control[data-fieldtype="Data"]', { timeout: 120000 }).first().type(itemCode, { force: true });
 
cy.contains('div.item-name', itemCode, { timeout: 120000 })
      .eq(0)
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .wait(20000, { log: false })
      .click({ force: true });
        cy.wait(20000, { log: false });

    cy.get('.checkout-btn, .submit-order-btn', { timeout: 120000 }).first().click({ force: true });
    cy.get('.submit-order-btn', { timeout: 120000 }).click({ force: true });
    cy.get('.btn.btn-primary.btn-sm.btn-modal-primary', { timeout: 60000 }).first().click({ force: true });

    cy.get('.indicator-pill.whitespace-nowrap.green', { timeout: 120000 })
      .should('be.visible')
      .invoke('text')
      .then((statusText) => {
        const actualStatus = String(statusText || '').replace(/\s+/g, ' ').trim();
        cy.log(`POS invoice status value: ${actualStatus}`);
        // eslint-disable-next-line no-console
        console.log('POS invoice status value:', actualStatus);
        expect(actualStatus).to.contain('Paid'); 

      });
  });

  it.skip('TC02_applyDiscountOnSalesInvoiceUsingPosView', () => {
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
