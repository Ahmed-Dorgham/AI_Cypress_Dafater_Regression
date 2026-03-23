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
  openDeliveryNotesList,
  clickNewPrimaryAction,
  waitForOverlay,
  selectPurchaseReceiptSupplier,
  selectPurchaseReceiptItem,
  saveAndSubmitPurchaseReceipt,
  selectDeliveryNoteCustomer,
  selectDeliveryNoteItem,
  saveAndSubmitDeliveryNote,
  Saveandsubmit as saveAndSubmit,
} from '../support/migrationHelpers';

describe('DeliveryNotesTest (Migrated from Selenium)', () => {
  it('TC01_createNewDeliveryNoteAndSubmit', () => {
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

    cy.get('span.label.label-success:visible', { timeout: 120000 })
      .first()
      .invoke('text')
      .then((statusText) => {
        const actualStatus = String(statusText).replace(/\s+/g, ' ').trim();
        cy.log(`Purchase Receipt status value: ${actualStatus}`);
        expect(actualStatus).to.contain('معتمد');
      });

    openDeliveryNotesList();
    clickNewPrimaryAction();
     selectDeliveryNoteCustomer();
        selectDeliveryNoteItem(itemCode);
        saveAndSubmitDeliveryNote();

    cy.get('span.label.label-success:visible', { timeout: 60000 })
      .first()
      .invoke('text')
      .then((statusText) => {
        const actualStatus = String(statusText).replace(/\s+/g, ' ').trim();
        cy.log(`Delivery Note status value: ${actualStatus}`);
        expect(actualStatus).to.contain('معتمد');
      });
  });
});
