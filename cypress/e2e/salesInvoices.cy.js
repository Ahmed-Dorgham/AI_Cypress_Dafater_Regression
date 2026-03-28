/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  createItem,
  addItemPriceStandardSelling,
  openCompaniesListPage,
  startNewSalesInvoice,
  fillSalesInvoiceCore,
  selectSalesInvoiceCustomer,
  getSalesInvoiceDueDate,
  saveSalesInvoice,
  submitSalesInvoice,
  openSalesOrdersListPage,
  clickOnNewSalesOrdersBtn,
  fillSalesOrderCore,
  saveAndSubmitSalesOrder,
  getSalesOrderStatusBeforeCreatingRelatedSalesInvoice,
  createNewSalesInvoiceFromSalesOrder,
  saveAndSubmitSalesInvoiceFromSalesOrder,
  saveAndSubmitSalesInvoiceFromDeliveryNote,
  getSalesOrderStatusAfterCreatingRelatedSalesInvoice,
  openDeliveryNotesList,
  openPurchaseReceiptsList,
  clickNewPrimaryAction,
  selectPurchaseReceiptSupplier,
  selectPurchaseReceiptItem,
  saveAndSubmitPurchaseReceipt,
  selectDeliveryNoteCustomer,
  selectDeliveryNoteItem,
  saveAndSubmitDeliveryNote,
  openCreateMenuAndChoose,
  saveAndSubmitPaymentDoc,
  getSalesInvoiceNameFromUrl,
  getInvoiceNameInsideCreditNote,
  saveAndSubmitCreditNoteFromSalesInvoice,
  openGeneralLedgerReportFromSalesInvoice,
  waitForOverlay,
} from '../support/migrationHelpers';

const createPreparedItem = () => {
  const env = getMigrationEnv();
  const itemCode = `item ${Date.now()}`;
  createItem(itemCode);
  addItemPriceStandardSelling(itemCode, env.itemPrice);
  return cy.wrap(itemCode);
};

const selectSalesInvoiceItemLite = (itemCode) => {
  const normalizedItemCode = String(itemCode || '').toLowerCase().replace(/\s+/g, ' ').trim();

  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const scrollTarget = $body.find(
      '[data-fieldname="items"]:visible, .form-grid:visible, .grid-body:visible, [data-fieldname="item_code"]:visible, [data-target="Item"]:visible'
    )[0];
    if (scrollTarget) {
      cy.wrap(scrollTarget, { log: false }).scrollIntoView({ offset: { top: -180, left: 0 } });
    } else {
      cy.scrollTo('bottom', { ensureScrollable: false, log: false });
    }
  });

  const rowItemCodeStaticCell = [
    '.form-grid-container .grid-body .rows .grid-row:visible:first .grid-static-col[data-fieldname="item_code"] .static-area',
    '.form-grid-container .grid-body .rows .grid-row:visible:first .grid-static-col[data-fieldname="item_code"]',
  ];
  const rowItemCodeInputSelectors = [
    '.form-grid-container .grid-body .rows .grid-row:visible:first input[data-fieldname="item_code"]',
    '.form-grid-container .grid-body .rows .grid-row:visible:first input[data-target="Item"]',
  ];

  cy.get(rowItemCodeStaticCell.join(', '), { timeout: LONG_TIMEOUT })
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .dblclick({ force: true });

  cy.get(rowItemCodeInputSelectors.join(', '), { timeout: LONG_TIMEOUT })
    .then(($inputs) => {
      const inputTarget = $inputs.toArray().find((el) => Cypress.$(el).is(':visible')) || $inputs[0];
      if (!inputTarget) {
        throw new Error(`Could not find sales invoice item input using selectors: ${rowItemCodeInputSelectors.join(', ')}`);
      }

      cy.wrap(inputTarget, { log: false })
        .as('salesInvoiceItemFieldLite')
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true })
        .clear({ force: true })
        .type(String(itemCode), { force: true });

      const dataTarget = Cypress.$(inputTarget).attr('data-target');
      const dataTargetSelector = dataTarget
        ? `[data-target="${dataTarget}"] + ul li:visible, [data-target="${dataTarget}"] ~ ul li:visible`
        : '';
      const fallbackSelector =
        'ul.awesomplete li:visible, .awesomplete [role="option"]:visible, .awesomplete li:visible, [role="listbox"] li:visible, [role="option"]:visible';
      const optionSelectors = [dataTargetSelector, fallbackSelector].filter(Boolean).join(', ');

      const clickMatchingItemOption = (attempt = 0) =>
        cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
          const opts = $body.find(optionSelectors).toArray();
          const matchingOpt = opts.find((el) => {
            const text = (Cypress.$(el).text() || '').toLowerCase().replace(/\s+/g, ' ').trim();
            return normalizedItemCode ? text.includes(normalizedItemCode) : false;
          });
          const chosenOpt = matchingOpt || opts[0];

          if (chosenOpt) {
            return cy.wrap(chosenOpt, { log: false })
              .scrollIntoView({ offset: { top: -120, left: 0 } })
              .click({ force: true });
          }

          if (attempt >= 20) {
            throw new Error('Sales invoice item options did not appear for the sales invoice item field.');
          }

          return cy.wait(200, { log: false }).then(() => clickMatchingItemOption(attempt + 1));
        });

      return cy.wait(250, { log: false }).then(() => clickMatchingItemOption());
    });
};

const fillSalesInvoiceCoreLite = ({ itemCode }) => {
  selectSalesInvoiceCustomer();
  getSalesInvoiceDueDate();
  selectSalesInvoiceItemLite(itemCode);

  cy.get('body').then(($body) => {
    const updateStock = $body.find('#update_stock, input[data-fieldname="update_stock"]');
    if (updateStock.length && Cypress.$(updateStock[0]).is(':checked')) {
      cy.wrap(updateStock[0]).click({ force: true });
    }
  });
};

const LONG_TIMEOUT = 120000;

const normalizeDigitsToAscii = (value) =>
  String(value || '').replace(/[\u0660-\u0669]/g, (digit) => String('\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'.indexOf(digit)));

const normalizeComparableText = (value) =>
  normalizeDigitsToAscii(value)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const normalizeAmountForContains = (value) =>
  normalizeComparableText(value).replace(/[, ]/g, '');

const extractNumericToken = (value) => {
  const normalized = normalizeDigitsToAscii(String(value || '')).replace(/,/g, '');
  const matches = normalized.match(/-?\d+(?:\.\d+)?/g);
  return matches && matches.length ? matches[matches.length - 1] : '';
};

const hasNumericAmount = (value) => extractNumericToken(value) !== '';

const getNumericValueFromCell = (cellEl) => {
  const $cell = Cypress.$(cellEl);
  const titleValue = String($cell.attr('title') || '').replace(/\s+/g, ' ').trim();
  const textValue = String($cell.text() || '').replace(/\s+/g, ' ').trim();
  return extractNumericToken(titleValue) || extractNumericToken(textValue) || '';
};

const assertAmountContains = (actualValue, expectedValue, assertionMessage) => {
  const actualNormalized = normalizeAmountForContains(actualValue);
  const expectedNormalized = normalizeAmountForContains(expectedValue);
  expect(actualNormalized, assertionMessage).to.contain(expectedNormalized);
};

const openSpecificCompanyWithoutScrollIntoView = (companyName = '') => {
  const normalizedName = normalizeComparableText(companyName || Cypress.expose('DAFATER_COMPANY_NAME') || '');

  const clickByDataName = (dataName) =>
    cy.get('a[data-doctype="Company"][data-name]:visible, a.link-itself[data-doctype="Company"][data-name]:visible', { timeout: LONG_TIMEOUT })
      .filter((_, el) => normalizeComparableText(Cypress.$(el).attr('data-name')) === normalizeComparableText(dataName))
      .first()
      .click({ force: true });

  const openRow = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const root = $body.find('.layout-main-section:visible, .frappe-list:visible, .result:visible').first();
      const anchors = (root.length ? root : $body)
        .find('a[data-doctype="Company"][data-name]:visible, a.link-itself[data-doctype="Company"][data-name]:visible')
        .toArray();

      const matched = normalizedName
        ? anchors.find((a) => {
          const $a = Cypress.$(a);
          const byDataName = normalizeComparableText($a.attr('data-name'));
          const byText = normalizeComparableText($a.text());
          const byTitle = normalizeComparableText($a.attr('title'));
          return byDataName === normalizedName || byText === normalizedName || byTitle.includes(normalizedName);
        })
        : anchors[0];

      if (matched) {
        const dataName = String(Cypress.$(matched).attr('data-name') || '').trim();
        if (dataName) return clickByDataName(dataName);
        return cy.wrap(matched, { log: false }).click({ force: true });
      }

      if (attempt >= 20) {
        throw new Error(`Could not open company: ${normalizedName || '(first visible company)'}`);
      }

      return cy
        .get('.layout-main-section:visible, .frappe-list:visible, body', { timeout: LONG_TIMEOUT })
        .first()
        .scrollTo('top', { ensureScrollable: false, log: false })
        .wait(250, { log: false })
        .then(() => openRow(attempt + 1));
    });

  return openRow().then(() => {
    waitForOverlay();
  });
};

const openCompanyTabByTextLocal = (tabPattern, debugName) => {
  const openTab = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const tab = $body
        .find('.form-tabs a:visible, .nav-tabs a:visible, [role="tab"]:visible, a[data-toggle="tab"]:visible')
        .toArray()
        .find((el) => tabPattern.test(String(Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim()));

      if (tab) {
        return cy.wrap(tab, { log: false }).click({ force: true });
      }

      if (attempt >= 15) {
        return cy.contains('a:visible, button:visible, [role="tab"]:visible', tabPattern, { timeout: LONG_TIMEOUT })
          .first()
          .click({ force: true });
      }

      return cy.wait(250, { log: false }).then(() => openTab(attempt + 1));
    });

  return openTab().then(() => {
    waitForOverlay();
    Cypress.log({ name: 'CompanyTab', message: `Opened ${debugName}` });
  });
};

const readCompanySettingValueLocal = ({ fieldSelectors, labelRegex, debugName }) => {
  const getTextValue = (el) => {
    const $el = Cypress.$(el);
    return $el.is('input, textarea, select')
      ? String($el.val() || '').replace(/\s+/g, ' ').trim()
      : String($el.text() || '').replace(/\s+/g, ' ').trim();
  };

  const resolveValue = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const visibleScope = $body.find('.layout-main-section:visible, .form-page:visible, .form-layout:visible').first();
      const root = visibleScope.length ? visibleScope : $body;

      const directTarget = root
        .find(fieldSelectors.join(', '))
        .toArray()
        .find((el) => {
          const txt = getTextValue(el);
          return Cypress.$(el).is(':visible') && /\S/.test(txt);
        });

      if (directTarget) return getTextValue(directTarget);

      const labelTarget = root
        .find('label:visible, .control-label:visible, .field-label:visible, .frappe-control label:visible')
        .toArray()
        .find((el) => labelRegex.test(String(Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim()));

      if (labelTarget) {
        const wrapper = Cypress.$(labelTarget).closest('.frappe-control, .form-group, .control-input, .section-body')[0]
          || Cypress.$(labelTarget).parent()[0];
        if (wrapper) {
          const valueEl = Cypress.$(wrapper)
            .find('.control-value, .like-disabled-input, .text-muted, .value, input')
            .toArray()
            .find((el) => /\S/.test(getTextValue(el)));
          if (valueEl) return getTextValue(valueEl);
        }
      }

      if (attempt >= 20) {
        throw new Error(`${debugName} not found in Company settings`);
      }

      return cy
        .get('.layout-main-section:visible, .form-page:visible, .form-layout:visible, body', { log: false })
        .first()
        .scrollTo('bottom', { ensureScrollable: false, log: false })
        .wait(250, { log: false })
        .then(() => resolveValue(attempt + 1));
    });

  return resolveValue().then((value) => {
    Cypress.log({ name: debugName, message: value });
    return value;
  });
};

const getDefaultDebitAccount = () => {
  const fieldSelectors = [
    '[data-fieldname="default_debit_account"] .control-value:visible',
    '[data-fieldname="default_debit_account"] .like-disabled-input:visible',
    'input[data-fieldname="default_debit_account"]:visible',
    '[data-fieldname="default_receivable_account"] .control-value:visible',
    '[data-fieldname="default_receivable_account"] .like-disabled-input:visible',
    'input[data-fieldname="default_receivable_account"]:visible',
  ];

  const getTextValue = (el) => {
    const $el = Cypress.$(el);
    return $el.is('input, textarea, select')
      ? String($el.val() || '').replace(/\s+/g, ' ').trim()
      : String($el.text() || '').replace(/\s+/g, ' ').trim();
  };

  const waitAccountsIndicator = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const pageText = String($body.text() || '');
      const hasIndicator = /chart\s*of\s*accounts|\u062f\u0644\u064a\u0644\s*\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a/i.test(pageText);
      if (hasIndicator || attempt >= 12) return;
      return cy.wait(250, { log: false }).then(() => waitAccountsIndicator(attempt + 1));
    });

  const resolveDebitAccount = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const visibleScope = $body.find('.layout-main-section:visible, .form-page:visible, .form-layout:visible').first();
      const root = visibleScope.length ? visibleScope : $body;

      const directTarget = root
        .find(fieldSelectors.join(', '))
        .toArray()
        .find((el) => /\S/.test(getTextValue(el)));
      if (directTarget) return getTextValue(directTarget);

      const titleCandidates = root
        .find('h3.ellipsis.title-text, h3[class*="ellipsis"][class*="title-text"]')
        .toArray();
      const fifthTitle = titleCandidates[4];
      const fifthTitleText = fifthTitle ? String(Cypress.$(fifthTitle).text() || '').replace(/\s+/g, ' ').trim() : '';
      if (fifthTitleText) return fifthTitleText;

      const clickTarget = root
        .find(
          '[data-fieldname="default_debit_account"] .control-input-wrapper:visible, [data-fieldname="default_receivable_account"] .control-input-wrapper:visible, [data-fieldname="default_debit_account"] .control-value:visible, [data-fieldname="default_receivable_account"] .control-value:visible'
        )
        .toArray()[0];

      if (clickTarget && attempt < 20) {
        return cy.wrap(clickTarget, { log: false })
          .click({ force: true })
          .wait(200, { log: false })
          .then(() => resolveDebitAccount(attempt + 1));
      }

      if (attempt >= 20) {
        throw new Error('Default debit account not found in Company settings');
      }

      return cy
        .get('.layout-main-section:visible, .form-page:visible, .form-layout:visible, body', { log: false })
        .first()
        .scrollTo('bottom', { ensureScrollable: false, log: false })
        .wait(250, { log: false })
        .then(() => resolveDebitAccount(attempt + 1));
    });

  return openCompanyTabByTextLocal(/accounts|\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a/i, 'Accounts')
    .then(() => waitAccountsIndicator())
    .then(() => resolveDebitAccount(0))
    .then((value) => {
      Cypress.log({ name: 'Default debit account', message: value });
      return value;
    });
};

const getDefaultIncomeAccount = () => {
  const fieldSelectors = [
    '[data-fieldname="default_income_account"] .control-value:visible',
    '[data-fieldname="default_income_account"] .like-disabled-input:visible',
    'input[data-fieldname="default_income_account"]:visible',
    '[data-fieldname="income_account"] .control-value:visible',
    '[data-fieldname="income_account"] .like-disabled-input:visible',
    'input[data-fieldname="income_account"]:visible',
  ];

  const getTextValue = (el) => {
    const $el = Cypress.$(el);
    return $el.is('input, textarea, select')
      ? String($el.val() || '').replace(/\s+/g, ' ').trim()
      : String($el.text() || '').replace(/\s+/g, ' ').trim();
  };

  const waitAccountsIndicator = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const pageText = String($body.text() || '');
      const hasIndicator = /chart\s*of\s*accounts|\u062f\u0644\u064a\u0644\s*\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a/i.test(pageText);
      if (hasIndicator || attempt >= 12) return;
      return cy.wait(250, { log: false }).then(() => waitAccountsIndicator(attempt + 1));
    });

  const resolveIncomeAccount = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const visibleScope = $body.find('.layout-main-section:visible, .form-page:visible, .form-layout:visible').first();
      const root = visibleScope.length ? visibleScope : $body;

      const directTarget = root
        .find(fieldSelectors.join(', '))
        .toArray()
        .find((el) => /\S/.test(getTextValue(el)));
      if (directTarget) return getTextValue(directTarget);

      const titleCandidates = root
        .find('h3.ellipsis.title-text, h3[class*="ellipsis"][class*="title-text"]')
        .toArray();
      const sixthTitle = titleCandidates[5];
      const sixthTitleText = sixthTitle ? String(Cypress.$(sixthTitle).text() || '').replace(/\s+/g, ' ').trim() : '';
      if (sixthTitleText) return sixthTitleText;

      const clickTarget = root
        .find(
          '[data-fieldname="default_income_account"] a[title="Open Link"]:visible, [data-fieldname="default_income_account"] .control-input-wrapper:visible, [data-fieldname="income_account"] .control-input-wrapper:visible, [data-fieldname="default_income_account"] .control-value:visible, [data-fieldname="income_account"] .control-value:visible'
        )
        .toArray()[0];

      if (clickTarget && attempt < 20) {
        return cy.wrap(clickTarget, { log: false })
          .click({ force: true })
          .wait(200, { log: false })
          .then(() => resolveIncomeAccount(attempt + 1));
      }

      if (attempt >= 20) {
        throw new Error('Default income account not found in Company settings');
      }

      return cy
        .get('.layout-main-section:visible, .form-page:visible, .form-layout:visible, body', { log: false })
        .first()
        .scrollTo('bottom', { ensureScrollable: false, log: false })
        .wait(250, { log: false })
        .then(() => resolveIncomeAccount(attempt + 1));
    });

  return openCompanyTabByTextLocal(/accounts|\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a/i, 'Accounts')
    .then(() => waitAccountsIndicator())
    .then(() => resolveIncomeAccount(0))
    .then((value) => {
      Cypress.log({ name: 'Default income account', message: value });
      return value;
    });
};

const readSalesInvoiceAmount = ({ fieldSelectors, labelRegex, debugName }) => {
  const readValue = (el) => {
    const $el = Cypress.$(el);
    return $el.is('input,textarea,select')
      ? String($el.val() || '').replace(/\s+/g, ' ').trim()
      : String($el.text() || '').replace(/\s+/g, ' ').trim();
  };

  const resolveAmount = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const visibleScope = $body.find('.layout-main-section:visible, .form-page:visible, .form-layout:visible').first();
      const root = visibleScope.length ? visibleScope : $body;

      const directTarget = root
        .find(fieldSelectors.join(', '))
        .toArray()
        .find((el) => {
          const txt = readValue(el);
          return Cypress.$(el).is(':visible') && /\d/.test(txt);
        });

      if (directTarget) return readValue(directTarget);

      const labelTarget = root
        .find('label:visible, .control-label:visible, .field-label:visible, .frappe-control label:visible')
        .toArray()
        .find((el) => labelRegex.test(String(Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim()));

      if (labelTarget) {
        const wrapper = Cypress.$(labelTarget).closest('.frappe-control, .form-group, .control-input, .section-body')[0]
          || Cypress.$(labelTarget).parent()[0];
        if (wrapper) {
          const valueTarget = Cypress.$(wrapper)
            .find('.control-value, .like-disabled-input, .text-muted, .value, input')
            .toArray()
            .find((el) => /\d/.test(readValue(el)));
          if (valueTarget) return readValue(valueTarget);
        }
      }

      if (attempt >= 20) {
        throw new Error(`${debugName} not found on Sales Invoice page`);
      }

      return cy
        .get('.layout-main-section:visible, .form-page:visible, .form-layout:visible, body', { log: false })
        .first()
        .scrollTo('bottom', { ensureScrollable: false, log: false })
        .wait(250, { log: false })
        .then(() => resolveAmount(attempt + 1));
    });

  return resolveAmount();
};

const findFirstVisibleNodeByXpath = (doc, xpath) => {
  const snapshot = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  for (let i = 0; i < snapshot.snapshotLength; i += 1) {
    const node = snapshot.snapshotItem(i);
    if (node && Cypress.$(node).is(':visible')) return node;
  }
  return null;
};

const findVisibleAmountNodeByField = (doc, fieldName) => {
  if (!fieldName) return null;

  const fieldRoots = Cypress.$(doc)
    .find(
      `.page-container:visible [data-fieldname="${fieldName}"], .layout-main-section:visible [data-fieldname="${fieldName}"], .form-page:visible [data-fieldname="${fieldName}"], [data-fieldname="${fieldName}"]:visible`
    )
    .toArray()
    .filter((el) => Cypress.$(el).is(':visible'));

  for (let i = 0; i < fieldRoots.length; i += 1) {
    const root = fieldRoots[i];
    const candidate = Cypress.$(root)
      .find('.control-value.like-disabled-input span:visible, .control-value.like-disabled-input:visible, .control-value span:visible, .control-value:visible')
      .toArray()
      .find((el) => /\d/.test(String(Cypress.$(el).text() || Cypress.$(el).prop('textContent') || '')));

    if (candidate) return candidate;
    if (/\d/.test(String(Cypress.$(root).text() || ''))) return root;
  }

  return null;
};

const readVisibleAmountByXpath = ({ xpath, fieldName, debugName, readTextContent = false }) => {
  const resolveAmount = (attempt = 0) =>
    waitForOverlay()
      .then(() => cy.document({ log: false }))
      .then((doc) => {
        const node = findFirstVisibleNodeByXpath(doc, xpath) || findVisibleAmountNodeByField(doc, fieldName);
        if (node) {
          return cy.wrap(node, { log: false })
            .scrollIntoView({ offset: { top: -120, left: 0 } })
            .should('be.visible')
            .then(($node) => {
              const raw = readTextContent
                ? String($node.prop('textContent') || '')
                : String($node.text() || '');
              const amountText = raw.replace(/\s+/g, ' ').trim();
              Cypress.log({ name: debugName, message: amountText });
              return amountText;
            });
        }

        if (attempt >= 30) {
          throw new Error(`${debugName} not found on Sales Invoice page`);
        }

        return cy
          .get('.layout-main-section:visible, .form-page:visible, .form-layout:visible, body', { log: false })
          .first()
          .scrollTo('bottom', { ensureScrollable: false, log: false })
          .wait(250, { log: false })
          .then(() => resolveAmount(attempt + 1));
      });

  return resolveAmount(0);
};

const getGrandTotalAmountOfSalesInvoice = () => {
  const grandTotalXpath = "//div[@data-fieldname='grand_total']/div/div/div/div[2]/div/span";
  waitForOverlay();
  return cy
    .xpath(grandTotalXpath, { timeout: LONG_TIMEOUT })
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .should('be.visible')
    .invoke('text')
    .then((text) => {
      const amountText = String(text || '').replace(/\s+/g, ' ').trim();
      Cypress.log({ name: 'GrandTotalSalesInvoice', message: amountText });
      return amountText;
    });
};

const getTotalAmountOfSalesInvoice = () => {
  const totalAmountWithoutTaxXpath = "//div[@data-fieldname='total']/div/div/div/div[2]/div/span";
  waitForOverlay();
  return cy
    .xpath(totalAmountWithoutTaxXpath, { timeout: LONG_TIMEOUT })
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .should('be.visible')
    .invoke('prop', 'textContent')
    .then((text) => {
      const amountText = String(text || '').replace(/\s+/g, ' ').trim();
      Cypress.log({ name: 'TotalSalesInvoice', message: amountText });
      return amountText;
    });
};

const scrollPageToGeneralLedgerTable = () =>
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const $table = $body.find('.datatable:visible, .dt-instance-1:visible').first();

    if ($table.length) {
      return cy.wrap($table, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .should('be.visible')
        .wait(150, { log: false });
    }

    return cy.get('.report-wrapper:visible, .layout-main-section:visible, body', { timeout: LONG_TIMEOUT })
      .first()
      .scrollTo('bottom', { ensureScrollable: false, log: false })
      .wait(150, { log: false });
  });

const scrollGeneralLedgerReportPageDown = () =>
  cy.get('.layout-main-section:visible, .report-wrapper:visible, body', { timeout: LONG_TIMEOUT })
    .first()
    .scrollTo('bottom', { ensureScrollable: false, log: false })
    .wait(250, { log: false });

const accountNameCandidates = (accountName) => {
  const normalized = normalizeComparableText(accountName);
  const baseWithoutSuffix = normalized.replace(/\s*-\s*[^-]+$/, '').trim();
  return Array.from(new Set([normalized, baseWithoutSuffix].filter(Boolean)));
};

const getGeneralLedgerAccountIndex = (accountName, debugName) => {
  const candidates = accountNameCandidates(accountName);

  const resolveIndex = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const accountCells = $body
        .find('.dt-cell__content--col-2:visible, .dt-cell--col-2 .dt-cell__content:visible')
        .toArray();

      let matchedIndex = 0;
      accountCells.forEach((cell, idx) => {
        const $cell = Cypress.$(cell);
        const raw = String($cell.attr('title') || $cell.text() || '').replace(/\s+/g, ' ').trim();
        const normalized = normalizeComparableText(raw);
        if (candidates.some((candidate) => normalized.includes(candidate))) {
          matchedIndex = idx + 1;
        }
      });

      if (matchedIndex > 0) {
        Cypress.log({ name: `${debugName} index`, message: String(matchedIndex) });
        return matchedIndex;
      }

      if (attempt >= 20) {
        throw new Error(`${debugName} index not found in General Ledger for ${String(accountName)}`);
      }

      return scrollGeneralLedgerReportPageDown().then(() => resolveIndex(attempt + 1));
    });

  return scrollPageToGeneralLedgerTable().then(() => resolveIndex(0));
};

const getGeneralLedgerValueAtColumnByIndex = ({ colIndex, rowIndex, debugName }) => {
  const resolveValue = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const columnCells = $body
        .find(`.dt-cell__content--col-${colIndex}:visible, .dt-cell--col-${colIndex} .dt-cell__content:visible`)
        .toArray();

      const targetCell = columnCells[rowIndex - 1];
      if (targetCell) {
        const value = getNumericValueFromCell(targetCell)
          || String(Cypress.$(targetCell).text() || '').replace(/\s+/g, ' ').trim();

        Cypress.log({ name: debugName, message: value });
        return value;
      }

      if (attempt >= 20) {
        throw new Error(`${debugName} value not found at col-${colIndex} and index-${rowIndex}`);
      }

      return scrollGeneralLedgerReportPageDown().then(() => resolveValue(attempt + 1));
    });

  return scrollPageToGeneralLedgerTable().then(() => resolveValue(0));
};

const getClosingValueForInvoiceAtGL = ({ colIndex, debugName }) => {
  const closingPattern = /closing|ending\s*balance/i;

  const resolveValue = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const rows = $body
        .find('.dt-row:visible')
        .toArray()
        .filter((row) => !Cypress.$(row).hasClass('dt-row-header'));

      const closingRow = rows.find((row) => closingPattern.test(String(Cypress.$(row).text() || '')));
      if (closingRow) {
        const closingCell = Cypress.$(closingRow)
          .find(`.dt-cell__content--col-${colIndex}:visible, .dt-cell--col-${colIndex} .dt-cell__content:visible`)
          .toArray()[0];

        if (closingCell) {
          const value = getNumericValueFromCell(closingCell)
            || String(Cypress.$(closingCell).text() || '').replace(/\s+/g, ' ').trim();
          Cypress.log({ name: debugName, message: value });
          return value;
        }
      }

      const columnValues = $body
        .find(`.dt-cell__content--col-${colIndex}:visible, .dt-cell--col-${colIndex} .dt-cell__content:visible`)
        .toArray()
        .map((cell) => getNumericValueFromCell(cell))
        .filter((value) => hasNumericAmount(value));

      if (columnValues.length) {
        const value = columnValues[columnValues.length - 1];
        Cypress.log({ name: debugName, message: value });
        return value;
      }

      if (attempt >= 20) {
        throw new Error(`${debugName} not found in General Ledger report`);
      }

      return scrollGeneralLedgerReportPageDown().then(() => resolveValue(attempt + 1));
    });

  return scrollPageToGeneralLedgerTable().then(() => resolveValue(0));
};

describe('SalesInvoicesTest (Migrated from Selenium)', () => {
  it('TC01_createNewSalesInvoiceAndSaveOnly', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedItem().then((itemCode) => {
      startNewSalesInvoice();
      fillSalesInvoiceCore({ itemCode });
      saveSalesInvoice();
      cy.get('.indicator-pill.no-indicator-dot.whitespace-nowrap.red, .indicator.red', { timeout: 120000 })
        .should('be.visible')
        .then(($el) => {
          const indicatorText = ($el.first().text() || '').trim();
          cy.log(`Sales invoice indicator text: ${indicatorText}`);
          // eslint-disable-next-line no-console
          console.log('Sales invoice indicator text:', indicatorText);
        });
    });
  });

  it('TC02_createNewSalesInvoiceAndSubmit', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedItem().then((itemCode) => {
      startNewSalesInvoice();
      fillSalesInvoiceCore({ itemCode });
      submitSalesInvoice();
      cy.get('.label.label-success, .indicator-pill.no-indicator-dot.whitespace-nowrap.green', { timeout: 120000 })
        .should('be.visible')
        .then(($el) => {
          const indicatorText = ($el.first().text() || '').trim();
          cy.log(`Sales invoice indicator text: ${indicatorText}`);
          // eslint-disable-next-line no-console
          console.log('Sales invoice indicator text:', indicatorText);
        });
    });
  });

  it('TC03_createNewSalesInvoiceFromSalesOrder', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedItem().then((itemCode) => {
      openSalesOrdersListPage();
      clickOnNewSalesOrdersBtn();
      fillSalesOrderCore(itemCode);
      saveAndSubmitSalesOrder();

          cy.contains(
  '.label.label-success:visible',
  '\u0645\u0639\u062a\u0645\u062f',
  { timeout: LONG_TIMEOUT }
).should('be.visible');

      cy.url().as('salesOrderUrl');
      cy.url().then((salesOrderUrl) => {
        cy.log(`Sales Order URL: ${salesOrderUrl}`);
        // eslint-disable-next-line no-console
        console.log('Sales Order URL:', salesOrderUrl);
        cy.wrap(salesOrderUrl, { log: false }).as('salesOrderUrl');
      });

      getSalesOrderStatusBeforeCreatingRelatedSalesInvoice().then((statusBefore) => {
        createNewSalesInvoiceFromSalesOrder();
        saveAndSubmitSalesInvoiceFromSalesOrder();

        cy.get('@salesOrderUrl').then((salesOrderUrl) => {
          cy.visit(String(salesOrderUrl));
          waitForOverlay();
          cy.contains(
            '.label.label-success:visible, .indicator-pill.no-indicator-dot.whitespace-nowrap.green:visible, .indicator-pill:visible, .indicator:visible',
            '\u0645\u0639\u062a\u0645\u062f',
            { timeout: LONG_TIMEOUT }
          ).should('be.visible');

          getSalesOrderStatusAfterCreatingRelatedSalesInvoice().then((statusAfter) => {
            expect(statusBefore.includes(statusAfter)).to.eq(false);
            cy.log(`Sales Order status before: ${statusBefore}`);
            cy.log(`Sales Order status after : ${statusAfter}`);
          });
        });
      });
    });
  });

  it('TC04_createCreditNoteFromSalesInvoice', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedItem().then((itemCode) => {
      startNewSalesInvoice();
      fillSalesInvoiceCore({ itemCode });
      submitSalesInvoice();
      getSalesInvoiceNameFromUrl().then((salesInvoiceName) => {
       openCreateMenuAndChoose(['مرتجع / اشعار دائن', 'credit']);
        saveAndSubmitCreditNoteFromSalesInvoice();
        cy.get('.label.label-success, .indicator-pill.no-indicator-dot.whitespace-nowrap.green', { timeout: LONG_TIMEOUT })
          .should('be.visible')
          .then(($el) => {
            const indicatorText = ($el.first().text() || '').trim();
            cy.log(`Sales invoice indicator text: ${indicatorText}`);
            // eslint-disable-next-line no-console
            console.log('Sales invoice indicator text:', indicatorText);
          });
        getInvoiceNameInsideCreditNote().then((invoiceNameInsideCreditNote) => {
          expect(invoiceNameInsideCreditNote).to.contain(salesInvoiceName);
        });
      });
    });
  });

  it.skip('TC05_createNewSalesInvoiceAndCheckInGrossProfitReport', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedItem().then((itemCode) => {
      startNewSalesInvoice();
      fillSalesInvoiceCore({ itemCode });
      submitSalesInvoice();
      cy.contains('button,a', '?????', { timeout: LONG_TIMEOUT }).first().click({ force: true });
      cy.contains('a,button', '?????? ???? ???????', { timeout: 120000 }).should('exist');
    });
  });

  it('TC06_createPaymentForSalesInvoice', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedItem().then((itemCode) => {
      startNewSalesInvoice();
      fillSalesInvoiceCore({ itemCode });
      submitSalesInvoice();
      getSalesInvoiceNameFromUrl().then((salesInvoiceName) => {
        cy.url().as('salesInvoiceUrl');
       cy.contains(
  '.label:visible, .indicator-pill:visible, .indicator:visible',
  /\u063a\u064a\u0631\s*\u0645\u062f\u0641\u0648\u0639|unpaid|partly\s*paid|partially\s*paid|paid/i,
  { timeout: LONG_TIMEOUT }
)
          .invoke('text')
          .then((textBefore) => {
            const statusBefore = String(textBefore || '').replace(/\s+/g, ' ').trim();
            cy.wrap(statusBefore, { log: false }).as('invoicePaymentStatusBefore');
          });

        openCreateMenuAndChoose(['دفع', 'payment']);

        // Verify payment includes the same related Sales Invoice name.
        cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
          const invoiceNameAtPaymentPage = String($body.text() || '').replace(/\s+/g, ' ').trim();
          expect(invoiceNameAtPaymentPage).to.contain(salesInvoiceName);
        });

        saveAndSubmitPaymentDoc(Date.now());

        // Verify Payment Entry status is Submitted.
        cy.contains(
          '.label.label-success:visible, .indicator-pill.no-indicator-dot.whitespace-nowrap.green:visible, .indicator-pill:visible, .indicator:visible',
          '\u0645\u0639\u062a\u0645\u062f',
          { timeout: LONG_TIMEOUT }
        ).should('be.visible');

        // Open related Sales Invoice and verify payment status becomes Paid.
        cy.get('@salesInvoiceUrl').then((salesInvoiceUrl) => {
          cy.visit(String(salesInvoiceUrl));
          waitForOverlay();
          cy.contains(
            '.label:visible, .indicator-pill:visible, .indicator:visible',
            /\u0645\u062f\u0641\u0648\u0639|paid/i,
            { timeout: LONG_TIMEOUT }
          )
            .invoke('text')
            .then((textAfter) => {
              const statusAfter = String(textAfter || '').replace(/\s+/g, ' ').trim();
              cy.get('@invoicePaymentStatusBefore').then((statusBefore) => {
                expect(statusAfter, 'invoice payment status after payment').to.match(/\u0645\u062f\u0641\u0648\u0639|paid/i);
                expect(String(statusAfter).toLowerCase(), 'invoice payment status changed after payment')
                  .to.not.eq(String(statusBefore).toLowerCase());
              });
            });
        });
      });
    });
  });

  it('TC07_createNewSalesInvoiceFromDeliveryNote', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedItem().then((itemCode) => {
      openPurchaseReceiptsList();
      clickNewPrimaryAction();
      waitForOverlay();
      selectPurchaseReceiptSupplier();
      selectPurchaseReceiptItem(itemCode);
      saveAndSubmitPurchaseReceipt();

      openDeliveryNotesList();
      clickNewPrimaryAction();
      cy.reload();
      selectDeliveryNoteCustomer();
      selectDeliveryNoteItem(itemCode);
      saveAndSubmitDeliveryNote();
       cy.contains(
          'button:visible, .btn:visible, [role="button"]:visible, a:visible',
          /\u0625\u0646\u0634\u0627\u0621|\u0627\u0646\u0634\u0627\u0621|create/i,
          { timeout: LONG_TIMEOUT }
        ).should('be.visible');

        cy.url().as('deliveryNoteUrl');

      getSalesOrderStatusBeforeCreatingRelatedSalesInvoice().then((deliveryNoteStatusBefore) => {
       
        openCreateMenuAndChoose(['\u0641\u0627\u062a\u0648\u0631\u0629 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a', 'sales invoice', 'invoice']);
        saveAndSubmitSalesInvoiceFromDeliveryNote();

        cy.get('@deliveryNoteUrl').then((deliveryNoteUrl) => {
          cy.visit(String(deliveryNoteUrl));
          waitForOverlay();
          cy.get('span.indicator-pill.no-indicator-dot.whitespace-nowrap.green:visible > span:visible', { timeout: 120000 })
            .first()
            .should('be.visible')
            .invoke('text')
            .then((statusText) => {
              const deliveryNoteStatusAfter = String(statusText || '').replace(/\s+/g, ' ').trim();
              const beforeNormalized = String(deliveryNoteStatusBefore || '').replace(/\s+/g, ' ').trim().toLowerCase();
              const afterNormalized = deliveryNoteStatusAfter.toLowerCase();

              expect(afterNormalized).to.match(/(?:\u0623\u0643\u062a\u0645\u0644|\u0627\u0643\u062a\u0645\u0644|completed)/i);
              expect(afterNormalized).to.not.eq(beforeNormalized);

              cy.log(`Delivery Note status before creating related sales invoice: ${deliveryNoteStatusBefore}`);
              cy.log(`Delivery Note status after creating related sales invoice : ${deliveryNoteStatusAfter}`);
            });
        });
      });
    });
  });

  it('TC08_createNewSalesInvoiceAndCheckInGeneralLedgerReport', () => {
    const env = getMigrationEnv();
    const companyName = String(Cypress.expose('DAFATER_COMPANY_NAME') || 'BusinessClouds (Demo)');
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    openCompaniesListPage();
    openSpecificCompanyWithoutScrollIntoView(companyName);
    getDefaultDebitAccount().as('defaultDebitAccountAtCompanySettings');
    getDefaultIncomeAccount().as('defaultIncomeAccountAtCompanySettings');

    cy.get('@defaultDebitAccountAtCompanySettings').then((defaultDebitAccountAtCompanySettings) => {
      cy.log(`default debit account at company settings is ${defaultDebitAccountAtCompanySettings}`);
    });
    cy.get('@defaultIncomeAccountAtCompanySettings').then((defaultIncomeAccountAtCompanySettings) => {
      cy.log(`default income account at company settings is ${defaultIncomeAccountAtCompanySettings}`);
    });

    cy.visit(env.v5Url);
    waitForOverlay();

    createPreparedItem().then((itemCode) => {
      startNewSalesInvoice();
      fillSalesInvoiceCoreLite({ itemCode });
      submitSalesInvoice();

      getGrandTotalAmountOfSalesInvoice().as('grandTotalAmountForSalesInvoice');
      getTotalAmountOfSalesInvoice().as('totalAmountForSalesInvoice');

      cy.get('@grandTotalAmountForSalesInvoice').then((grandTotalAmountForSalesInvoice) => {
        cy.log(`grand total amount of sales invoice is ${grandTotalAmountForSalesInvoice}`);
      });
      cy.window({ log: false }).then((win) => {
        win.scrollTo(0, 0);
      });
      cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        const $salesPage = $body
          .find('.content.page-container:visible, .page-container:visible')
          .filter((_, el) => Cypress.$(el).find('[data-fieldname="grand_total"]').length > 0)
          .first();
        if ($salesPage.length) {
          cy.wrap($salesPage, { log: false }).scrollTo('top', { ensureScrollable: false, log: false });
        }
      });
      cy.get('@totalAmountForSalesInvoice').then((totalAmountForSalesInvoice) => {
        cy.log(`total amount of sales invoice is ${totalAmountForSalesInvoice}`);
      });

      openGeneralLedgerReportFromSalesInvoice();
      cy.get('body').should(($body) => {
        const pageText = String($body.text() || '');
        expect(
          /general\s*ledger|\u062f\u0641\u062a\u0631\s*\u0627\u0644(?:\u0623|\u0627)\u0633\u062a\u0627\u0630/i.test(pageText),
          'General Ledger report is opened'
        ).to.eq(true);
      });
      scrollPageToGeneralLedgerTable();

      cy.get('@defaultDebitAccountAtCompanySettings').then((defaultDebitAccountAtCompanySettings) => {
        getGeneralLedgerAccountIndex(defaultDebitAccountAtCompanySettings, 'Default debit account')
          .then((debitAccountIndexAtGL) => {
            getGeneralLedgerValueAtColumnByIndex({
              colIndex: 3,
              rowIndex: debitAccountIndexAtGL,
              debugName: 'Default debit account value',
            }).as('valueAtDefaultDebitAccountAtGL');
          });
      });

      cy.get('@defaultIncomeAccountAtCompanySettings').then((defaultIncomeAccountAtCompanySettings) => {
        getGeneralLedgerAccountIndex(defaultIncomeAccountAtCompanySettings, 'Default income account')
          .then((incomeAccountIndexAtGL) => {
            getGeneralLedgerValueAtColumnByIndex({
              colIndex: 4,
              rowIndex: incomeAccountIndexAtGL,
              debugName: 'Default income account value',
            }).as('valueAtDefaultIncomeAccountAtGL');
          });
      });

      getClosingValueForInvoiceAtGL({
        colIndex: 3,
        debugName: 'Closing debit value',
      }).as('closingDebitValueAtGl');
      getClosingValueForInvoiceAtGL({
        colIndex: 4,
        debugName: 'Closing credit value',
      }).as('closingCreditValueAtGl');

      cy.get('@valueAtDefaultDebitAccountAtGL').then((valueAtDefaultDebitAccountAtGL) => {
        cy.get('@grandTotalAmountForSalesInvoice').then((grandTotalAmountForSalesInvoice) => {
          assertAmountContains(
            valueAtDefaultDebitAccountAtGL,
            grandTotalAmountForSalesInvoice,
            'Default debit account at GL has the same value as grand total amount for sales invoice'
          );
          cy.log(`Default debit account at GL has ${valueAtDefaultDebitAccountAtGL}, and grand total amount for sales invoice is ${grandTotalAmountForSalesInvoice}`);
        });
      });

      cy.get('@valueAtDefaultIncomeAccountAtGL').then((valueAtDefaultIncomeAccountAtGL) => {
        cy.get('@totalAmountForSalesInvoice').then((totalAmountForSalesInvoice) => {
          assertAmountContains(
            valueAtDefaultIncomeAccountAtGL,
            totalAmountForSalesInvoice,
            'Default income account at GL has the same value as total amount for sales invoice'
          );
          cy.log(`Default income account at GL has ${valueAtDefaultIncomeAccountAtGL}, and total amount for sales invoice is ${totalAmountForSalesInvoice}`);
        });
      });

      cy.get('@closingDebitValueAtGl').then((closingDebitValueAtGl) => {
        cy.get('@grandTotalAmountForSalesInvoice').then((grandTotalAmountForSalesInvoice) => {
          assertAmountContains(
            closingDebitValueAtGl,
            grandTotalAmountForSalesInvoice,
            'Closing debit value at GL equals grand total amount for sales invoice'
          );
          cy.log(`Closing debit value at GL is ${closingDebitValueAtGl} and grand total amount for sales invoice is ${grandTotalAmountForSalesInvoice}`);
        });
      });

      cy.get('@closingCreditValueAtGl').then((closingCreditValueAtGl) => {
        cy.get('@grandTotalAmountForSalesInvoice').then((grandTotalAmountForSalesInvoice) => {
          assertAmountContains(
            closingCreditValueAtGl,
            grandTotalAmountForSalesInvoice,
            'Closing credit value at GL equals grand total amount for sales invoice'
          );
          cy.log(`Closing credit value at GL is ${closingCreditValueAtGl} and grand total amount for sales invoice is ${grandTotalAmountForSalesInvoice}`);
        });
      });
    });
  });
});







