/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  createItem,
  addItemPriceStandardSelling,
  startNewSalesInvoice,
  fillSalesInvoiceCore,
  saveSalesInvoice,
  submitSalesInvoice,
  applyWriteOffAmount,
  applyDiscountAmount,
  removeTaxesIfPresent,
  readOutstandingAmount,
  openCreateMenuAndChoose,
} from '../support/migrationHelpers';

const createDraftInvoice = (itemCode) => {
  startNewSalesInvoice();
  fillSalesInvoiceCore({ itemCode });
  saveSalesInvoice();
};

describe('WriteOffSalesInvoicesTest (Migrated from Selenium)', () => {
  it('TC01_createNewSalesInvoiceAndSaveAfterApplyCompleteWriteOff', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);
    createDraftInvoice(itemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      applyWriteOffAmount(beforeOutstanding);
      saveSalesInvoice();
      readOutstandingAmount().then((afterOutstanding) => {
        expect(afterOutstanding).to.be.lessThan(beforeOutstanding + 0.0001);
      });
    });
  });

  it('TC02_createNewSalesInvoiceWhenApplyWriteOffAndPayAdvanceAmountWithValueEqualToGrandTotalAmount', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);
    createDraftInvoice(itemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      applyWriteOffAmount(beforeOutstanding / 2);
      saveSalesInvoice();
      readOutstandingAmount().then((afterOutstanding) => {
        expect(afterOutstanding).to.be.lessThan(beforeOutstanding);
      });
    });
  });

  it('TC03_verifyValidationWhenPayAdvanceAmountFirstAndApplyWriteOffWithValueGreaterThanGrandTotalAmount', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);
    createDraftInvoice(itemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      applyWriteOffAmount(beforeOutstanding * 1.5);
      saveSalesInvoice();
      cy.get('.msgprint', { timeout: 120000 }).should('be.visible');
    });
  });

  it('TC05_verifyValidationWhenApplyDiscountAndApplyWriteOffWithValueGreaterThanGrandTotalAmount', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);
    createDraftInvoice(itemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      applyDiscountAmount(beforeOutstanding / 2);
      applyWriteOffAmount(beforeOutstanding);
      saveSalesInvoice();
      cy.get('.msgprint', { timeout: 120000 }).should('be.visible');
    });
  });

  it('TC06_verifyValidationWhenApplyWriteOffWithNegative', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);
    createDraftInvoice(itemCode);

    applyWriteOffAmount(-100);
    saveSalesInvoice();
    cy.get('.msgprint', { timeout: 120000 }).should('contain.text', 'سالب');
  });

  it('TC07_verifyValidationWhenApplyCompleteWriteOffThenRemoveTaxes', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);
    createDraftInvoice(itemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      applyWriteOffAmount(beforeOutstanding);
      removeTaxesIfPresent();
      saveSalesInvoice();
      cy.get('.msgprint', { timeout: 120000 }).should('be.visible');
    });
  });

  it('TC08_verifyValidationWhenApplyCompleteWriteOffAndDiscountThenRemoveTaxes', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);
    createDraftInvoice(itemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      applyDiscountAmount(beforeOutstanding / 2);
      applyWriteOffAmount(beforeOutstanding / 2);
      removeTaxesIfPresent();
      saveSalesInvoice();
      cy.get('.msgprint', { timeout: 120000 }).should('be.visible');
    });
  });

  it('TC09_verifyWhenCreateCreditNoteAfterApplyWriteOffAndRemoveTaxesOnSalesInvoice', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    addItemPriceStandardSelling(itemCode, env.itemPrice);
    createDraftInvoice(itemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      applyWriteOffAmount(beforeOutstanding / 2);
      removeTaxesIfPresent();
      submitSalesInvoice();
      openCreateMenuAndChoose(['مرتجع', 'اشعار دائن', 'credit']);
      submitSalesInvoice();
      cy.get('.label.label-success, .indicator-pill.no-indicator-dot.whitespace-nowrap.green', { timeout: 120000 }).should('exist');
    });
  });
});
