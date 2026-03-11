/// <reference types="cypress" />
import 'cypress-xpath';

const rawBase =
  Cypress.config('baseUrl') ||
  Cypress.env('DAFATER_BASE_URL') ||
  (Cypress.env('scope') === 'Regression'
    ? 'http://temp-qc-tmp.dafater.biz'
    : 'http://temp-qc-tmp.dafater.biz');

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
const LONG_TIMEOUT = 400000;

const waitForOverlay = () => {
  cy.get('body').then(($body) => {
    if ($body.find(OVERLAY).length) {
      cy.get(OVERLAY, { timeout: 120000 }).should('not.be.visible');
    }
  });
};

const openItemsListViaSidebar = () => {
  cy.log('click burger icon to show sidebar');
  cy.get('#show-sidebar', { timeout: 120000 }).should('exist').click();

  cy.log('click warehouse tab');
  cy.get('#module-anchor-Stock', { timeout: 20000 }).should('be.visible').click({ force: true });

  cy.log('click items tab');
  cy.get('#sidebar-stock-item', { timeout: 40000 }).should('exist').click({ force: true });
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

describe('Adding Items Suite', () => {
  it('TC01_create New Sales And Purchase Item', () => {
    const randomNumber = Math.floor(Math.random() * 1_000_000);
    const itemName = `item ${randomNumber}`;

    cy.log('open login');
    const loginUrl = `${baseUrl}/#login`;
    cy.visit(loginUrl);

    cy.log('enter credentials');
    cy.get('#login_email, #login_id', { timeout: 20000 }).type(creds.username, { force: true });
    cy.get('#login_password, #pass', { timeout: 20000 }).type(creds.password, { force: true });
    cy.get('#login_btn').click();

    waitForOverlay();

    cy.log('open items list from sidebar (as Selenium flow)');
    openItemsListViaSidebar();
    waitForOverlay();

    cy.log('capture items count before creation');
    getAllItemsCount('countBefore');

    cy.log('start item creation');
    cy.get('[id="page-List/Item/List"]', { timeout: LONG_TIMEOUT }).should('exist')
      .find('.btn.btn-default.btn-sm.primary-action.toolbar-btn')
      .click({ force: true });

    cy.get('.modal-dialog', { timeout: 180000 }).should('be.visible')
      .find('.btn.btn-secondary.btn-sm').eq(0)
      .should('not.be.disabled')
      .click();

    cy.get('#item_code', { timeout: LONG_TIMEOUT }).first().should('be.visible')
      .type(itemName, { force: true });

    cy.get('[data-action_name="Save"]', { timeout: LONG_TIMEOUT }).should('not.be.disabled').click();
    cy.get('.indicator-pill.no-indicator-dot.whitespace-nowrap.blue', { timeout: LONG_TIMEOUT }).should('be.visible');

    cy.get('.ellipsis.title-text', { timeout: LONG_TIMEOUT }).should('be.visible')
      .eq(3)
      .invoke('text')
      .as('createdName');

    cy.get('@createdName').then((value) => {
      cy.log(`created item name is: ${value}`);
      expect(value.trim()).to.contain(itemName);
    });

    cy.log('return to items list and verify presence');
    openItemsListViaSidebar();
    waitForOverlay();
    cy.contains('a[data-doctype="Item"]', itemName, { timeout: LONG_TIMEOUT }).should('be.visible');

    cy.log('capture items count after creation');
    getAllItemsCount('countAfter');

    cy.get('@countBefore').then((before) => {
      cy.get('@countAfter').then((after) => {
        expect(toInt(after)).to.be.greaterThan(toInt(before));
      });
    });

    cy.log('navigate to Selling Price Lists');
    cy.get('#module-anchor-Selling', { timeout: 20000 }).should('be.visible').click({ force: true });
    cy.xpath("//*[contains(@id,'sidebar-selling-price-lists')] | //*[contains(@href,'#List/Price List')]", {
      timeout: LONG_TIMEOUT,
    })
      .should('exist')
      .click({ force: true });
    waitForOverlay();

    cy.log('open Standard Selling list');
    cy.xpath("//*[contains(@title,'Standard Selling')]", { timeout: LONG_TIMEOUT }).should('be.visible').click();

    cy.log('open Items Prices Table');
    cy.xpath("(//*[contains(@class,'btn btn-default toolbar-btn')])[1]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .click({ force: true });

    cy.log('open Item Price page (full view)');
    cy.xpath("(//*[contains(@class,'btn btn-default btn-sm primary-action toolbar-btn')])[3]", {
      timeout: LONG_TIMEOUT,
    })
      .should('be.visible')
      .click({ force: true });
    cy.xpath("(//button[@class='btn btn-secondary btn-sm '])[1]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .click({ force: true });

    cy.log('add price for created item');
    cy.xpath("(//input[contains(@data-fieldname,'item_code')])[1]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .should('be.enabled')
      .click({ force: true })
      .clear({ force: true })
      .type(itemName, { force: true });
    cy.xpath("(//input[contains(@data-fieldname,'price_list_rate')])[1]", { timeout: LONG_TIMEOUT })
      .scrollIntoView()
      .should('be.visible')
      .should('be.enabled')
      .clear({ force: true })
      .type(ITEM_PRICE, { force: true });
    cy.contains('button, a', 'Save', { matchCase: false, timeout: LONG_TIMEOUT }).click({ force: true });
    cy.get('#alert-container, .indicator-pill.no-indicator-dot.whitespace-nowrap.blue', { timeout: LONG_TIMEOUT }).should(
      'be.visible',
    );
  });

  it('TC02_createNewSalesItem', () => {
    const randomNumber = Math.floor(Math.random() * 1_000_000_000);
    const itemName = `item 2${randomNumber}`;

    cy.log('open login');
    cy.visit(`${baseUrl}/#login`);

    cy.log('enter credentials');
    cy.get('#login_email, #login_id', { timeout: 20000 }).type(creds.username, { force: true });
    cy.get('#login_password, #pass', { timeout: 20000 }).type(creds.password, { force: true });
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
    cy.get('.modal-dialog', { timeout: 180000 }).should('be.visible')
      .find('.btn.btn-secondary.btn-sm').eq(0)
      .should('not.be.disabled')
      .click();

    cy.log('fill item code');
    cy.xpath("(//input[contains(@data-fieldname,'item_code')])[1]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .type(itemName, { force: true });

    cy.log('select item group (first option)');
    cy.xpath("(//*[contains(@id,'item_group')])[2]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .click({ force: true });
    cy.xpath("//li[contains(@class,'ui-menu-item')][1]/a | (//*[contains(@data-target,'Item Group')]/following-sibling::ul/li)[1]", {
      timeout: LONG_TIMEOUT,
    }).click({ force: true });

    cy.log('unselect purchase item checkbox');
    cy.xpath("//*[contains(@id,'item-purchasing_tab-tab')]", { timeout: LONG_TIMEOUT }).click({ force: true });
    cy.xpath("//*[contains(@id,'is_purchase_item')]", { timeout: LONG_TIMEOUT }).click({ force: true });

    cy.log('save sales item');
    cy.get('[data-action_name="Save"]', { timeout: LONG_TIMEOUT }).should('not.be.disabled').click({ force: true });
    cy.get('.indicator-pill.no-indicator-dot.whitespace-nowrap.blue', { timeout: LONG_TIMEOUT }).should('be.visible');

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

    cy.log('open login');
    cy.visit(`${baseUrl}/#login`);

    cy.log('enter credentials');
    cy.get('#login_email, #login_id', { timeout: 20000 }).type(creds.username, { force: true });
    cy.get('#login_password, #pass', { timeout: 20000 }).type(creds.password, { force: true });
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
    cy.get('.modal-dialog', { timeout: 180000 }).should('be.visible')
      .find('.btn.btn-secondary.btn-sm').eq(0)
      .should('not.be.disabled')
      .click();

    cy.log('fill item code');
    cy.xpath("(//input[contains(@data-fieldname,'item_code')])[1]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .type(itemName, { force: true });

    cy.log('select item group (first option)');
    cy.xpath("(//*[contains(@id,'item_group')])[2]", { timeout: LONG_TIMEOUT })
      .should('be.visible')
      .click({ force: true });
    cy.xpath("//li[contains(@class,'ui-menu-item')][1]/a | (//*[contains(@data-target,'Item Group')]/following-sibling::ul/li)[1]", {
      timeout: LONG_TIMEOUT,
    }).click({ force: true });

    cy.log('unselect sales item checkbox');
    cy.xpath("//*[contains(@id,'item-sales_details-tab')]", { timeout: LONG_TIMEOUT }).click({ force: true });
    cy.xpath("//*[contains(@id,'is_sales_item')]", { timeout: LONG_TIMEOUT }).click({ force: true });

    cy.log('save purchase item');
    cy.get('[data-action_name="Save"]', { timeout: LONG_TIMEOUT }).should('not.be.disabled').click({ force: true });
    cy.get('.indicator-pill.no-indicator-dot.whitespace-nowrap.blue', { timeout: LONG_TIMEOUT }).should('be.visible');

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
