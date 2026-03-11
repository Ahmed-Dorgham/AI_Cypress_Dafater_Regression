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

describe('PurchaseReceiptsTest (Migrated from Selenium)', () => {
  it('TC01_createNewPurchaseReceiptAndSubmit', () => {
    const env = getMigrationEnv();
    const itemCode = `item ${Date.now()}`;

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    createItem(itemCode);
    openSellingPriceLists();
    openStandardSellingList();
    openItemsPricesTable();
    openItemPricePage();
    addingPriceForItem(itemCode, env.itemPrice);

    openPurchaseReceiptsList();
    clickNewPrimaryAction();
    waitForOverlay();
    selectPurchaseReceiptSupplier();
    selectPurchaseReceiptItem(itemCode);
    saveAndSubmitPurchaseReceipt();

    cy.get('.label.label-success, .indicator-pill', { timeout: 120000 }).should('contain.text', 'معتمد');
  });
});
