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
  openDeliveryNotesList,
  clickNewPrimaryAction,
  selectDeliveryNoteCustomer,
  selectDeliveryNoteItem,
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

    openDeliveryNotesList();
    clickNewPrimaryAction();
    selectDeliveryNoteCustomer();
    selectDeliveryNoteItem(itemCode);
    saveAndSubmit();

    cy.get('.label.label-success, .indicator-pill', { timeout: 60000 }).should('contain.text', 'معتمد');
  });
});
