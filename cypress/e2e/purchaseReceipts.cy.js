/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  createItem,
  openSellingPriceLists,
  openStandardSellingList,
  openItemsPricesTable,
  openItemPricePage,
  addingPriceForItem,
  openPurchaseReceiptsList,
  clickNewPrimaryAction,
  waitForOverlay,
  selectPurchaseReceiptSupplier,
  selectPurchaseReceiptItem,
  saveAndSubmitPurchaseReceipt,
} from '../support/migrationHelpers';

const LONG_TIMEOUT = 360000;

const createPreparedItem = (env = getMigrationEnv()) => {
  const itemCode = `item ${Date.now()}`;
  createItem(itemCode);
  openSellingPriceLists();
  openStandardSellingList();
  openItemsPricesTable();
  openItemPricePage();
  addingPriceForItem(itemCode, env.itemPrice);
  return cy.wrap(itemCode);
};

const ensureAtLoginPage = (env) => {
  cy.location('hash', { timeout: LONG_TIMEOUT }).then((hash) => {
    if (!/login/i.test(String(hash || ''))) {
      cy.visit(env.v5Url);
      waitForOverlay();
    }
  });

  cy.get('#login_email, #login_id', { timeout: LONG_TIMEOUT }).should('be.visible');
};

describe('PurchaseReceiptsTest (Migrated from Selenium)', () => {
  let preparedItemCode;

  beforeEach(() => {
    const env = getMigrationEnv();
    ensureAtLoginPage(env);
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    if (preparedItemCode) return;

    createPreparedItem(env).then((itemCode) => {
      preparedItemCode = itemCode;
    });
  });

  it('TC01_createNewPurchaseReceiptAndSubmit', () => {
    openPurchaseReceiptsList();
    clickNewPrimaryAction();
    waitForOverlay();
    selectPurchaseReceiptSupplier();
    selectPurchaseReceiptItem(preparedItemCode);
    saveAndSubmitPurchaseReceipt();

    cy.get('.label.label-success, .indicator-pill', { timeout: 120000 }).should('contain.text', '\u0645\u0639\u062a\u0645\u062f');
  });
});
