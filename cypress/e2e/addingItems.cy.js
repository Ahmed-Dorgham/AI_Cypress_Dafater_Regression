/// <reference types="cypress" />
import 'cypress-xpath';
import { getMigrationEnv, getUiConfig, createItem, addItemPriceStandardSelling, clickFullScreenRequired } from '../support/migrationHelpers';

const getSharedUiConfig = () => Cypress.expose('uiConfig') || getUiConfig();

const ITEM_PRICE = Cypress.expose('DAFATER_ITEM_PRICE') || '100'; 
const OVERLAY = '.freeze-message-container';
const LONG_TIMEOUT = 20000;

const waitForOverlay = () => {
  cy.get('body').then(($body) => {
    if ($body.find(OVERLAY).length) {
      cy.get(OVERLAY, { timeout: 30000 }).should('not.be.visible');
    }
  });
};

const openItemsListViaSidebar = () => {
  cy.log('click burger icon to show sidebar');
  cy.get('#show-sidebar', { timeout: 30000 }).should('exist').click();

  cy.log('click warehouse tab');
  cy.get('#module-anchor-Stock', { timeout: 20000 }).should('be.visible').click({ force: true });

  cy.log('click items tab');
  cy.get('#sidebar-stock-item', { timeout: 40000 }).should('exist').click({ force: true });
};

const ensureSellingSidebarVisible = () => {
  cy.log('click burger icon to show sidebar');
  cy.get('#show-sidebar', { timeout: 30000 }).should('exist').click();
};
const getIndicatorCount = (index, aliasName) => {
  cy.get('.Item-listview-card', { timeout: LONG_TIMEOUT })
    .should('exist')
    .find('.list-indicators__item-indicator')
    .eq(index)
    .find('span')
    .invoke('text')
    .then((text) => cy.wrap(text.trim()).as(aliasName));
};

const getAllItemsCount = (aliasName) => getIndicatorCount(0, aliasName);
const getSalesItemsCount = (aliasName) => getIndicatorCount(1, aliasName);
const getPurchaseItemsCount = (aliasName) => getIndicatorCount(2, aliasName);

const toInt = (value) => parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 0;

const createPreparedItem = () => {
  const env = getMigrationEnv();
  const itemCode = `item ${Date.now()}`;

  createItem(itemCode);
  addItemPriceStandardSelling(itemCode, env.itemPrice);

  return cy.wrap(itemCode);
};
const clickItemPriceModalTitleUntilFullViewVisible = (attempt = 0) => {
  const maxAttempts = 5;

  cy.get('body').then(($body) => {
   cy.wait(20000, { log: false })
    const fullViewButton = $body.find("button.btn.btn-secondary.btn-sm:visible").filter((_, el) =>
      Cypress.$(el).text().includes('\u0639\u0631\u0636 \u0627\u0644\u0634\u0627\u0634\u0629 \u0643\u0627\u0645\u0644\u0629'),
    );
    if (fullViewButton.length) {
      return;
    }

    if (attempt >= maxAttempts) {
      throw new Error('Full view button did not become visible after clicking the item price modal title');
    }

    cy.contains('h4.modal-title', '\u0633\u0639\u0631 \u0627\u0644\u0635\u0646\u0641 \u062c\u062f\u064a\u062f', { timeout: LONG_TIMEOUT }).click({ force: true });
    clickItemPriceModalTitleUntilFullViewVisible(attempt + 1);
  });
};

describe('Adding Items Suite', () => {
  it('TC01_create New Sales And Purchase Item', () => {
    const randomNumber = Math.floor(Math.random() * 1_000_000);
    const itemName = `item ${randomNumber}`;


    cy.log('enter credentials');
    cy.get('#login_email, #login_id', { timeout: 20000 }).type(getSharedUiConfig().creds.username, { force: true });
    cy.get('#login_password, #pass', { timeout: 20000 }).type(getSharedUiConfig().creds.password, { force: true });
    cy.get('#login_btn').click();
    waitForOverlay();
    cy.log('open items list from sidebar');
    openItemsListViaSidebar();
    waitForOverlay();
    cy.log('capture sales & purchase counts before');
    getSalesItemsCount('salesBefore');
    getPurchaseItemsCount('purchaseBefore');
    cy.log('open new item form');
    cy.get('[id="page-List/Item/List"]', { timeout: LONG_TIMEOUT }).should('exist')
      .find('.btn.btn-default.btn-sm.primary-action.toolbar-btn')
      .click({ force: true });
 clickFullScreenRequired ();
    cy.log('fill item code');
    cy.xpath("(//input[contains(@data-fieldname,'item_code')])[1]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .type(itemName, { force: true });
    cy.log('select item group (first option)');
    cy.xpath("(//*[contains(@id,'item_group')])[2]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .click({ force: true });
    cy.log('save sales item');
    cy.get('[data-action_name="Save"]', { timeout: LONG_TIMEOUT }).should('not.be.disabled').click({ force: true });
    cy.get('.indicator-pill.no-indicator-dot.whitespace-nowrap.blue', { timeout: LONG_TIMEOUT }).scrollIntoView().should('be.visible');
    cy.log('verify created item name');
    cy.get('.ellipsis.title-text', { timeout: LONG_TIMEOUT }).should('be.visible')
      .eq(3)
      .invoke('text')
      .then((val) => expect(val.trim()).to.contain(itemName));
    cy.log('back to items list and verify presence');
    openItemsListViaSidebar();
    waitForOverlay();
    cy.contains('a[data-doctype="Item"]', itemName, { timeout: LONG_TIMEOUT }).should('be.visible');
    cy.log('capture counts after');
    getSalesItemsCount('salesAfter');
    getPurchaseItemsCount('purchaseAfter');
    cy.get('@salesBefore').then((before) => {
      cy.get('@salesAfter').then((after) => {
        expect(toInt(after)).to.be.greaterThan(toInt(before));
      });
    });

    cy.get('@purchaseBefore').then((before) => {
      cy.get('@purchaseAfter').then((after) => {
        expect(toInt(after)).to.greaterThan(toInt(before));
      });
    });

    cy.wait(10000);
  });

  it('TC02_createNewSalesItem', () => {
    const randomNumber = Math.floor(Math.random() * 1_000_000_000);
    const itemName = `item 2${randomNumber}`;


    cy.log('enter credentials');
    cy.get('#login_email, #login_id', { timeout: 20000 }).type(getSharedUiConfig().creds.username, { force: true });
    cy.get('#login_password, #pass', { timeout: 20000 }).type(getSharedUiConfig().creds.password, { force: true });
    cy.get('#login_btn').click();
    waitForOverlay();

    cy.log('open items list from sidebar');
    openItemsListViaSidebar();
    waitForOverlay();

    cy.log('capture sales & purchase counts before');
    getSalesItemsCount('salesBefore');
    getPurchaseItemsCount('purchaseBefore');

    cy.log('open new item form');
    cy.get('[id="page-List/Item/List"]', { timeout: LONG_TIMEOUT }).should('exist')
      .find('.btn.btn-default.btn-sm.primary-action.toolbar-btn')
      .click({ force: true });
 clickFullScreenRequired ();


    cy.log('fill item code');
    cy.xpath("(//input[contains(@data-fieldname,'item_code')])[1]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .type(itemName, { force: true });

    cy.log('select item group (first option)');
    cy.xpath("(//*[contains(@id,'item_group')])[2]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .click({ force: true });
 

 cy.log('unselect is purchase item checkbox');
cy.get('#item-purchasing_tab-tab').should('exist',{timeout:LONG_TIMEOUT}).click({ force: true });

cy.get('#item-purchasing_tab-tab').should('exist',{timeout:LONG_TIMEOUT}).click({ force: true });

cy.get('#is_purchase_item').should('be.visible',{timeout:LONG_TIMEOUT}).click();

    cy.log('save sales item');
    cy.get('[data-action_name="Save"]', { timeout: LONG_TIMEOUT }).should('not.be.disabled').click({ force: true });
    cy.get('.indicator-pill.no-indicator-dot.whitespace-nowrap.blue', { timeout: LONG_TIMEOUT }).scrollIntoView().should('be.visible');

    cy.log('verify created item name');
    cy.get('.ellipsis.title-text', { timeout: LONG_TIMEOUT }).should('be.visible')
      .eq(3)
      .invoke('text')
      .then((val) => expect(val.trim()).to.contain(itemName));

    cy.log('back to items list and verify presence');
    openItemsListViaSidebar();
    waitForOverlay();
    cy.contains('a[data-doctype="Item"]', itemName, { timeout: LONG_TIMEOUT }).should('be.visible');

    cy.log('capture counts after');
    getSalesItemsCount('salesAfter');
    getPurchaseItemsCount('purchaseAfter');

    cy.get('@salesBefore').then((before) => {
      cy.get('@salesAfter').then((after) => {
        expect(toInt(after)).to.be.greaterThan(toInt(before));
      });
    });

    cy.get('@purchaseBefore').then((before) => {
      cy.get('@purchaseAfter').then((after) => {
        expect(toInt(after)).to.equal(toInt(before));
      });
    });
  });

  it('TC03_createNewPurchaseItem', () => {
    const randomNumber = Math.floor(Math.random() * 1_000_000_000);
    const itemName = `item 2${randomNumber}`;


    cy.log('enter credentials');
    cy.get('#login_email, #login_id', { timeout: 20000 }).type(getSharedUiConfig().creds.username, { force: true });
    cy.get('#login_password, #pass', { timeout: 20000 }).type(getSharedUiConfig().creds.password, { force: true });
    cy.get('#login_btn').click();
    waitForOverlay();

    cy.log('open items list from sidebar');
    openItemsListViaSidebar();
    waitForOverlay();

    cy.log('capture sales & purchase counts before');
    getSalesItemsCount('salesBefore_p');
    getPurchaseItemsCount('purchaseBefore_p');

    cy.log('open new item form');
    cy.get('[id="page-List/Item/List"]', { timeout: LONG_TIMEOUT }).should('exist')
      .find('.btn.btn-default.btn-sm.primary-action.toolbar-btn')
      .click({ force: true });
clickFullScreenRequired ();


    cy.log('fill item code');
    cy.xpath("(//input[contains(@data-fieldname,'item_code')])[1]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .type(itemName, { force: true });

    cy.log('unselect is sales item checkbox');
cy.get('#item-sales_details-tab').should('exist',{timeout:LONG_TIMEOUT}).click();
cy.get('#item-sales_details-tab').should('exist',{timeout:LONG_TIMEOUT}).click();
cy.get('#is_sales_item').should('be.visible',{timeout:LONG_TIMEOUT}).click();

    cy.log('save purchase item');
    cy.get('[data-action_name="Save"]', { timeout: LONG_TIMEOUT }).should('not.be.disabled').click({ force: true });
    cy.get('.indicator-pill.no-indicator-dot.whitespace-nowrap.blue', { timeout: LONG_TIMEOUT }).scrollIntoView().should('be.visible');

    cy.log('verify created item name');
    cy.get('.ellipsis.title-text', { timeout: LONG_TIMEOUT }).should('be.visible')
      .eq(3)
      .invoke('text')
      .then((val) => expect(val.trim()).to.contain(itemName));

    cy.log('back to items list and verify presence');
    openItemsListViaSidebar();
    waitForOverlay();
    cy.contains('a[data-doctype="Item"]', itemName, { timeout: LONG_TIMEOUT }).should('be.visible');

    cy.log('capture counts after');
    getSalesItemsCount('salesAfter_p');
    getPurchaseItemsCount('purchaseAfter_p');

    cy.get('@purchaseBefore_p').then((before) => {
      cy.get('@purchaseAfter_p').then((after) => {
        expect(toInt(after)).to.be.greaterThan(toInt(before));
      });
    });

    cy.get('@salesBefore_p').then((before) => {
      cy.get('@salesAfter_p').then((after) => {
        expect(toInt(after)).to.equal(toInt(before));
      });
    });
  });
});





























