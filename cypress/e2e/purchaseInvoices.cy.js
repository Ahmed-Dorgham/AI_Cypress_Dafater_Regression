/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  createItem,
  addItemPriceStandardSelling,
  addItemPriceStandardBuying,
  startNewPurchaseOrder,
  fillPurchaseOrderCore,
  saveAndSubmitPurchaseOrder,
  getPurchaseOrderStatusBeforeCreatingRelatedPurchaseInvoice,
  createNewPurchaseInvoiceFromPurchaseOrder,
  saveAndSubmitPurchaseInvoiceFromPurchaseOrder,
  openCompaniesListPage,
  getDefaultCreditAccount,
  getDefaultExpenseAccount,
  getDefaultStockNotBilledAccount,
  openPurchaseReceiptsList,
  clickNewPrimaryAction,
  selectPurchaseReceiptSupplier,
  selectPurchaseReceiptItem,
  saveAndSubmitPurchaseReceipt,
  startNewPurchaseInvoice,
  selectPurchaseInvoiceSupplier,
  selectPurchaseInvoiceItem,
  submitPurchaseInvoice,
  submitPurchaseInvoiceWithoutUpdateStock,
  submitDebitNote,
  getGrandTotalAmountOfPurchaseInvoice,
  getTotalAmountOfPurchaseInvoice,
  openCreateMenuAndChoose,
  saveAndSubmitPaymentDoc,
  openGeneralLedgerReport,
  waitForOverlay,
} from '../support/migrationHelpers';


const createPreparedItem = () => {
  const env = getMigrationEnv();
  const itemCode = `item ${Date.now()}`;
  createItem(itemCode);
  addItemPriceStandardSelling(itemCode, env.itemPrice);
  return cy.wrap(itemCode);
};

const createPreparedBuyingItem = () => {
  const env = getMigrationEnv();
  const itemCode = `item ${Date.now()}`;
  createItem(itemCode);
  addItemPriceStandardBuying(itemCode, env.itemPrice);
  return cy.wrap(itemCode);
};

const logPurchaseInvoiceIndicatorText = () => {
  cy.get('.label.label-success, .indicator-pill.no-indicator-dot.whitespace-nowrap.green', { timeout: 120000 })
    .should('be.visible')
    .first()
    .invoke('text')
    .then((text) => {
      const indicatorText = String(text || '').replace(/\s+/g, ' ').trim();
      cy.log(`Purchase Invoice indicator text: ${indicatorText}`);
      // eslint-disable-next-line no-console
      console.log('Purchase Invoice indicator text:', indicatorText);
    });
};
const logPurchaseReceiptIndicatorText = () => {
  cy.get('.label.label-success, .indicator-pill.no-indicator-dot.whitespace-nowrap.green', { timeout: 120000 })
    .should('be.visible')
    .first()
    .invoke('text')
    .then((text) => {
      const indicatorText = String(text || '').replace(/\s+/g, ' ').trim();
      cy.log(`Purchase Receipt indicator text: ${indicatorText}`);
      // eslint-disable-next-line no-console
      console.log('Purchase Receipt indicator text:', indicatorText);
    });
};
const logDebitNoteIndicatorText = () => {
  cy.get('.label.label-success, .indicator-pill.no-indicator-dot.whitespace-nowrap.green', { timeout: 120000 })
    .should('be.visible')
    .first()
    .invoke('text')
    .then((text) => {
      const indicatorText = String(text || '').replace(/\s+/g, ' ').trim();
      cy.log(`Debit Note indicator text: ${indicatorText}`);
      // eslint-disable-next-line no-console
      console.log('Debit Note indicator text:', indicatorText);
    });
};

const logPaymentIndicatorText = () => {
  cy.get('.label.label-success, .indicator-pill.no-indicator-dot.whitespace-nowrap.green', { timeout: 120000 })
    .should('be.visible')
    .first()
    .invoke('text')
    .then((text) => {
      const indicatorText = String(text || '').replace(/\s+/g, ' ').trim();
      cy.log(`Payment indicator text: ${indicatorText}`);
      // eslint-disable-next-line no-console
      console.log('Payment indicator text:', indicatorText);
    });
};

const LONG_TIMEOUT = 120000;

const normalizeDigitsToAscii = (value) =>
  String(value || '').replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

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

const scrollGeneralLedgerTableDown = () =>
  scrollPageToGeneralLedgerTable().wait(220, { log: false });

const openSpecificCompanyWithoutScrollIntoView = (companyName = '') => {
  const normalizedName = normalizeComparableText(companyName || Cypress.env('DAFATER_COMPANY_NAME') || '');

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

const accountNameCandidates = (accountName) => {
  const normalized = normalizeComparableText(accountName);
  const baseWithoutSuffix = normalized.replace(/\s*-\s*[^-]+$/, '').trim();
  const withStock = baseWithoutSuffix.replace(/\basset\b/g, 'stock');
  const withAsset = baseWithoutSuffix.replace(/\bstock\b/g, 'asset');
  return Array.from(new Set([normalized, baseWithoutSuffix, withStock, withAsset].filter(Boolean)));
};

const rowMatchesAccountName = (rowText, accountName) => {
  const normalizedRow = normalizeComparableText(rowText);
  const candidates = accountNameCandidates(accountName);

  if (!normalizedRow || !candidates.length) return false;
  if (candidates.some((candidate) => normalizedRow.includes(candidate))) return true;

  const base = candidates[candidates.length - 1];
  const tokens = base.split(' ').filter((token) => token.length > 2 && !['the', 'and'].includes(token));
  const matchedTokens = tokens.filter((token) => normalizedRow.includes(token)).length;
  if (matchedTokens >= Math.min(3, tokens.length) && matchedTokens > 0) return true;

  const accountLooksLikeNotBilled = /not\s*billed|received\s*but\s*not\s*billed|غير\s*مفوتر|غير\s*مفو/i.test(base);
  if (accountLooksLikeNotBilled) {
    return /not\s*billed|received\s*but\s*not\s*billed|غير\s*مفوتر|غير\s*مفو/i.test(normalizedRow);
  }

  return false;
};

const extractDtRowIndex = (rowEl) => {
  const $row = Cypress.$(rowEl);
  const directAttr = $row.attr('data-row-index');
  if (directAttr !== undefined && directAttr !== null && String(directAttr) !== '') return String(directAttr);

  const directData = $row.data('row-index');
  if (directData !== undefined && directData !== null && String(directData) !== '') return String(directData);

  const className = String($row.attr('class') || '');
  const classMatch = className.match(/\bdt-row-(\d+)\b/);
  if (classMatch) return String(classMatch[1]);

  const nestedAttr = $row.find('[data-row-index]').first().attr('data-row-index');
  if (nestedAttr !== undefined && nestedAttr !== null && String(nestedAttr) !== '') return String(nestedAttr);

  return '';
};

const findGeneralLedgerRowByAccount = (accountName, attempt = 0) =>
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const rows = $body
      .find('.dt-scrollable .dt-row:visible, .datatable .dt-row:visible, .dt-row:visible')
      .toArray()
      .filter((row) => !Cypress.$(row).hasClass('dt-row-header'));

    const row = rows.find((candidate) => rowMatchesAccountName(Cypress.$(candidate).text(), accountName));

    if (row) return row;

    if (attempt >= 20) {
      throw new Error(`Could not find account row in General Ledger: ${String(accountName)}`);
    }

    return scrollGeneralLedgerTableDown()
      .wait(300, { log: false })
      .then(() => findGeneralLedgerRowByAccount(accountName, attempt + 1));
  });

const getGeneralLedgerValueByAccountAndColumn = ({
  accountName,
  colIndex,
  debugName,
  adjacentFromAccountCol2 = false,
}) =>
  findGeneralLedgerRowByAccount(accountName).then(() => {
    const resolveValue = (attempt = 0) =>
      cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        let valueCell = null;

        if (adjacentFromAccountCol2) {
          const candidates = accountNameCandidates(accountName);
          const accountCellCandidates = $body
            .find('.dt-cell__content--col-2:visible, .dt-cell--col-2 .dt-cell__content:visible')
            .toArray();

          const accountCell = accountCellCandidates.find((cell) => {
            const $cell = Cypress.$(cell);
            const anchor = $cell.find('a[data-doctype="Account"], a').first();
            const raw = String(
              anchor.attr('data-name')
                || anchor.attr('data-value')
                || anchor.text()
                || $cell.text()
                || ''
            );
            const normalized = normalizeComparableText(raw);
            return candidates.some((candidate) => normalized.includes(candidate));
          });

          if (accountCell) {
            const row = Cypress.$(accountCell).closest('.dt-row')[0] || accountCell;
            const rowIndex = extractDtRowIndex(row);
            const relatedRows = rowIndex
              ? $body
                .find(`.dt-row[data-row-index="${rowIndex}"], .dt-row-${rowIndex}, [data-row-index="${rowIndex}"].dt-row`)
                .toArray()
                .filter((r) => !Cypress.$(r).hasClass('dt-row-header'))
              : [row];

            valueCell = relatedRows
              .flatMap((r) =>
                Cypress.$(r)
                  .find(`.dt-cell__content--col-${colIndex}:visible, .dt-cell--col-${colIndex} .dt-cell__content:visible`)
                  .toArray()
              )
              .find((el) => hasNumericAmount(getNumericValueFromCell(el)));
          }
        } else {
          const matchedRow = $body
            .find('.dt-scrollable .dt-row:visible, .datatable .dt-row:visible, .dt-row:visible')
            .toArray()
            .filter((r) => !Cypress.$(r).hasClass('dt-row-header'))
            .find((r) => rowMatchesAccountName(Cypress.$(r).text(), accountName));

          if (matchedRow) {
            const rowIndex = extractDtRowIndex(matchedRow);
            const relatedRows = rowIndex
              ? $body
                .find(`.dt-row[data-row-index="${rowIndex}"], .dt-row-${rowIndex}, [data-row-index="${rowIndex}"].dt-row`)
                .toArray()
                .filter((r) => !Cypress.$(r).hasClass('dt-row-header'))
              : [matchedRow];

            valueCell = relatedRows
              .flatMap((r) =>
                Cypress.$(r)
                  .find(`.dt-cell__content--col-${colIndex}:visible, .dt-cell--col-${colIndex} .dt-cell__content:visible`)
                  .toArray()
              )
              .find((el) => hasNumericAmount(getNumericValueFromCell(el)));
          }
        }

        if (valueCell) {
          const raw = String(Cypress.$(valueCell).text() || '').replace(/\s+/g, ' ').trim();
          const titleValue = String(Cypress.$(valueCell).attr('title') || '').replace(/\s+/g, ' ').trim();
          const value = getNumericValueFromCell(valueCell) || extractNumericToken(raw) || raw;
          Cypress.log({ name: debugName, message: `at GL is ${value}` });
          // eslint-disable-next-line no-console
          console.log(`${debugName} at GL is`, value, '| title:', titleValue, '| raw:', raw);
          return value;
        }

        if (attempt >= 20) {
          throw new Error(`${debugName} value cell (col-${colIndex}) not found in General Ledger row for ${String(accountName)}`);
        }

        return scrollGeneralLedgerTableDown()
          .wait(350, { log: false })
          .then(() => resolveValue(attempt + 1));
      });

    return scrollGeneralLedgerTableDown()
      .wait(220, { log: false })
      .then(() => resolveValue(0));
  });

const getClosingValueForInvoiceAtGL = ({ colIndex, debugName }) => {
  const closingPattern = /closing|الرصيد\s*الختامي|ختامي/i;

  const resolveValue = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const rows = $body
        .find('.dt-scrollable .dt-row:visible, .datatable .dt-row:visible, .dt-row:visible')
        .toArray()
        .filter((row) => !Cypress.$(row).hasClass('dt-row-header'));

      const closingRow = rows.find((row) => closingPattern.test(String(Cypress.$(row).text() || '')));
      const rowCell = closingRow
        ? Cypress.$(closingRow)
          .find(`.dt-cell__content.dt-cell__content--col-${colIndex}:visible, .dt-cell__content--col-${colIndex}:visible`)
          .toArray()[0]
        : null;

      if (rowCell) {
        const value = String(Cypress.$(rowCell).text() || '').replace(/\s+/g, ' ').trim();
        Cypress.log({ name: debugName, message: `at general ledger is ${value}` });
        // eslint-disable-next-line no-console
        console.log(`${debugName} at general ledger is`, value);
        return value;
      }

      const columnCells = $body
        .find(`.dt-cell__content.dt-cell__content--col-${colIndex}:visible, .dt-cell__content--col-${colIndex}:visible`)
        .toArray()
        .map((el) => String(Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim())
        .filter((text) => /\d/.test(normalizeDigitsToAscii(text)));

      if (columnCells.length) {
        const value = columnCells[columnCells.length - 1];
        Cypress.log({ name: debugName, message: `at general ledger is ${value}` });
        // eslint-disable-next-line no-console
        console.log(`${debugName} at general ledger is`, value);
        return value;
      }

      if (attempt >= 20) {
        throw new Error(`${debugName} not found in General Ledger report`);
      }

      return scrollGeneralLedgerTableDown()
        .wait(300, { log: false })
        .then(() => resolveValue(attempt + 1));
    });

  return scrollGeneralLedgerTableDown()
    .wait(220, { log: false })
    .then(() => resolveValue(0));
};

describe('PurchaseInvoicesTest (Migrated from Selenium)', () => {
  it.skip('TC01_createNewPurchaseInvoiceAndSubmit', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedBuyingItem().then((itemCode) => {
      startNewPurchaseInvoice();
      selectPurchaseInvoiceSupplier();
      selectPurchaseInvoiceItem(itemCode);
      submitPurchaseInvoice();
      logPurchaseInvoiceIndicatorText();
    });
  });

  it.skip('TC02_createNewPurchaseInvoiceFromPurchaseOrder', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedBuyingItem().then((itemCode) => {
      startNewPurchaseOrder();
      fillPurchaseOrderCore(itemCode);
      saveAndSubmitPurchaseOrder();
      cy.contains(
        'button:visible, .btn:visible, [role="button"]:visible, a:visible',
        /\u0625\u0646\u0634\u0627\u0621|\u0627\u0646\u0634\u0627\u0621|create/i,
        { timeout: 120000 }
      ).should('be.visible');
      cy.url().as('purchaseOrderUrl');

      getPurchaseOrderStatusBeforeCreatingRelatedPurchaseInvoice().then((purchaseOrderStatusBefore) => {
        createNewPurchaseInvoiceFromPurchaseOrder();
        saveAndSubmitPurchaseInvoiceFromPurchaseOrder();

        cy.get('@purchaseOrderUrl').then((purchaseOrderUrl) => {
          cy.visit(String(purchaseOrderUrl));
          waitForOverlay();
          cy.get('span.indicator-pill.no-indicator-dot.whitespace-nowrap.green:visible > span:visible', { timeout: 120000 })
            .first()
            .should('be.visible')
            .invoke('text')
            .then((statusText) => {
              const purchaseOrderStatusAfter = String(statusText || '').replace(/\s+/g, ' ').trim();
              const beforeNormalized = String(purchaseOrderStatusBefore || '').replace(/\s+/g, ' ').trim().toLowerCase();
              const afterNormalized = purchaseOrderStatusAfter.toLowerCase();

              expect(afterNormalized).to.match(/(?:\u0623\u0643\u062a\u0645\u0644|\u0627\u0643\u062a\u0645\u0644|\u0645\u0643\u062a\u0645\u0644|completed)/i);
              expect(afterNormalized).to.not.eq(beforeNormalized);

              cy.log(`Purchase Order status before creating related purchase invoice: ${purchaseOrderStatusBefore}`);
              cy.log(`Purchase Order status after creating related purchase invoice : ${purchaseOrderStatusAfter}`);
            });
        });
      });
    });
  });

  it.skip('TC03_createDebitNoteFromPurchaseInvoice', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedBuyingItem().then((itemCode) => {
      startNewPurchaseInvoice();
      selectPurchaseInvoiceSupplier();
      selectPurchaseInvoiceItem(itemCode);
      submitPurchaseInvoice();
      openCreateMenuAndChoose(['ارجاع', 'اشعار مدين', 'debit']);
      submitDebitNote();
      logDebitNoteIndicatorText();
    });
  });

  it.skip('TC04_createPaymentForPurchaseInvoice', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedBuyingItem().then((itemCode) => {
      startNewPurchaseInvoice();
      selectPurchaseInvoiceSupplier();
      selectPurchaseInvoiceItem(itemCode);
      submitPurchaseInvoice();
      openCreateMenuAndChoose(['دفع', 'payment']);
      saveAndSubmitPaymentDoc(Date.now());
      logPaymentIndicatorText();
    });
  });

  it.skip('TC05_createNewPurchaseInvoiceFromPurchaseReceipt', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    createPreparedBuyingItem().then((itemCode) => {
      openPurchaseReceiptsList();
      clickNewPrimaryAction();
      waitForOverlay();
      selectPurchaseReceiptSupplier();
      selectPurchaseReceiptItem(itemCode);
      saveAndSubmitPurchaseReceipt();
      cy.contains(
        'button:visible, .btn:visible, [role="button"]:visible, a:visible',
        /\u0625\u0646\u0634\u0627\u0621|\u0627\u0646\u0634\u0627\u0621|create/i,
        { timeout: 120000 }
      ).should('be.visible');
      cy.contains(
        '.label.label-success:visible, .indicator-pill.no-indicator-dot.whitespace-nowrap.green:visible, .indicator-pill:visible, .indicator:visible',
        /\u0645\u0639\u062a\u0645\u062f|submitted/i,
        { timeout: 120000 }
      ).should('be.visible');
      cy.url().as('purchaseReceiptUrl');


      cy.get('span.indicator-pill.no-indicator-dot.whitespace-nowrap:visible > span:visible, span.indicator-pill:visible > span:visible', { timeout: 120000 })
        .first()
        .should('be.visible')
        .invoke('text')
        .then((beforeText) => {
          const purchaseReceiptStatusBefore = String(beforeText || '').replace(/\s+/g, ' ').trim();

          openCreateMenuAndChoose(['فاتورة المشتريات', 'purchase invoice', 'invoice']);
          submitPurchaseInvoiceWithoutUpdateStock();

          cy.get('@purchaseReceiptUrl').then((purchaseReceiptUrl) => {
            cy.visit(String(purchaseReceiptUrl));
            waitForOverlay();
            cy.get('span.indicator-pill.no-indicator-dot.whitespace-nowrap.green:visible > span:visible', { timeout: 120000 })
              .first()
              .should('be.visible')
              .invoke('text')
              .then((statusText) => {
                const purchaseReceiptStatusAfter = String(statusText || '').replace(/\s+/g, ' ').trim();
                const beforeNormalized = String(purchaseReceiptStatusBefore || '').replace(/\s+/g, ' ').trim().toLowerCase();
                const afterNormalized = purchaseReceiptStatusAfter.toLowerCase();

                expect(afterNormalized).to.match(/(?:\u0623\u0643\u062a\u0645\u0644|\u0627\u0643\u062a\u0645\u0644|\u0645\u0643\u062a\u0645\u0644|completed)/i);
                expect(afterNormalized).to.not.eq(beforeNormalized);

                cy.log(`Purchase Receipt status before creating related purchase invoice: ${purchaseReceiptStatusBefore}`);
                cy.log(`Purchase Receipt status after creating related purchase invoice : ${purchaseReceiptStatusAfter}`);
              });
          });
        });
    });
  });

  it('TC06_createNewPurchaseInvoiceAndCheckInGeneralLedgerReport', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });


      openCompaniesListPage();
      openSpecificCompanyWithoutScrollIntoView(Cypress.env('BusinessClouds (Demo)') || 'BusinessClouds (Demo)');
      getDefaultCreditAccount().as('defaultCreditAccountAtCompanySettings');
      getDefaultExpenseAccount().as('defaultExpenseAccountAtCompanySettings');
      getDefaultStockNotBilledAccount().as('defaultStockNotBilledAccountAtCompanySettings');

      cy.get('@defaultCreditAccountAtCompanySettings').then((defaultCreditAccountAtCompanySettings) => {
        cy.log(`default credit account at company settings is ${defaultCreditAccountAtCompanySettings}`);
      });
      cy.get('@defaultExpenseAccountAtCompanySettings').then((defaultExpenseAccountAtCompanySettings) => {
        cy.log(`default expense account at company settings is ${defaultExpenseAccountAtCompanySettings}`);
      });
      cy.get('@defaultStockNotBilledAccountAtCompanySettings').then((defaultStockNotBilledAccountAtCompanySettings) => {
        cy.log(`default stock not billed account at company settings is ${defaultStockNotBilledAccountAtCompanySettings}`);
      });

      // cy.get('@draftPurchaseInvoiceUrl').then((draftPurchaseInvoiceUrl) => {
      //   cy.visit(String(draftPurchaseInvoiceUrl));
      //   waitForOverlay();
      // });

    createPreparedBuyingItem().then((itemCode) => {
      startNewPurchaseInvoice();
      selectPurchaseInvoiceSupplier();

      selectPurchaseInvoiceItem(itemCode);
      submitPurchaseInvoice();
      getGrandTotalAmountOfPurchaseInvoice().as('grandTotalAmountForPurchaseInvoice');
      getTotalAmountOfPurchaseInvoice().as('totalAmountForPurchaseInvoice');

      cy.get('@grandTotalAmountForPurchaseInvoice').then((grandTotalAmountForPurchaseInvoice) => {
        cy.log(`grand total amount of purchase invoice is ${grandTotalAmountForPurchaseInvoice}`);
      });
      cy.get('@totalAmountForPurchaseInvoice').then((totalAmountForPurchaseInvoice) => {
        cy.log(`total amount of purchase invoice is ${totalAmountForPurchaseInvoice}`);
      });

      openGeneralLedgerReport();
      cy.get('body').should('contain.text', 'دفتر الأستاذ');
      scrollPageToGeneralLedgerTable();

      cy.get('@defaultCreditAccountAtCompanySettings').then((defaultCreditAccountAtCompanySettings) => {
        getGeneralLedgerValueByAccountAndColumn({
          accountName: defaultCreditAccountAtCompanySettings,
          colIndex: 4,
          debugName: 'Default credit account value',
          adjacentFromAccountCol2: true,
        }).as('valueAtDefaultCreditAccountAtGL');
      });

     

      cy.get('@defaultStockNotBilledAccountAtCompanySettings').then((defaultStockNotBilledAccountAtCompanySettings) => {
        getGeneralLedgerValueByAccountAndColumn({
          accountName: defaultStockNotBilledAccountAtCompanySettings,
          colIndex: 3,
          debugName: 'Default stock not billed account value',
          adjacentFromAccountCol2: true,
        }).as('valueAtDefaultStockNotBilledAccountAtGL');
      });

      getClosingValueForInvoiceAtGL({
        colIndex: 3,
        debugName: 'Closing debit value',
      }).as('closingDebitValueAtGl');
      getClosingValueForInvoiceAtGL({
        colIndex: 4,
        debugName: 'Closing credit value',
      }).as('closingCreditValueAtGl');

      cy.get('@valueAtDefaultCreditAccountAtGL').then((valueAtDefaultCreditAccountAtGL) => {
        cy.get('@grandTotalAmountForPurchaseInvoice').then((grandTotalAmountForPurchaseInvoice) => {
          assertAmountContains(
            valueAtDefaultCreditAccountAtGL,
            grandTotalAmountForPurchaseInvoice,
            'Default Credit Account At GL has the same value of grand total for purchase invoice'
          );
          cy.log(`Default Credit Account At GL report has ${valueAtDefaultCreditAccountAtGL} and grand total for purchase invoice is ${grandTotalAmountForPurchaseInvoice} and this is correct`);
        });
      });

      cy.get('@valueAtDefaultStockNotBilledAccountAtGL').then((valueAtDefaultStockNotBilledAccountAtGL) => {
        cy.get('@totalAmountForPurchaseInvoice').then((totalAmountForPurchaseInvoice) => {
          const normalizedStockNotBilledValue = normalizeAmountForContains(valueAtDefaultStockNotBilledAccountAtGL);
          const normalizedTotalAmount = normalizeAmountForContains(totalAmountForPurchaseInvoice);
          const stockNotBilledContainsTotal = normalizedStockNotBilledValue.includes(normalizedTotalAmount);
          const matchesEither = stockNotBilledContainsTotal;

          Cypress.log({
            name: 'GL Stock Not Billed Compare',
            message: `stock="${valueAtDefaultStockNotBilledAccountAtGL}" total="${totalAmountForPurchaseInvoice}" normalizedStock="${normalizedStockNotBilledValue}" normalizedTotal="${normalizedTotalAmount}"`,
          });
          // eslint-disable-next-line no-console
          console.log('GL Stock Not Billed Compare:', {
            stockValue: valueAtDefaultStockNotBilledAccountAtGL,
            totalAmount: totalAmountForPurchaseInvoice,
            normalizedStockValue: normalizedStockNotBilledValue,
            normalizedTotalAmount,
            matchesEither,
          });

          expect(
            matchesEither,
            `default stock not billed account at GL has the same value of total amount for purchase invoice | stock="${valueAtDefaultStockNotBilledAccountAtGL}" | total="${totalAmountForPurchaseInvoice}" | normalizedStock="${normalizedStockNotBilledValue}" | normalizedTotal="${normalizedTotalAmount}"`
          ).to.eq(true);

          cy.log(`Default stock not billed account at GL has ${valueAtDefaultStockNotBilledAccountAtGL}, and total amount for purchase invoice is ${totalAmountForPurchaseInvoice}`);
        });
      });

      cy.get('@closingDebitValueAtGl').then((closingDebitValueAtGl) => {
        cy.get('@grandTotalAmountForPurchaseInvoice').then((grandTotalAmountForPurchaseInvoice) => {
          assertAmountContains(
            closingDebitValueAtGl,
            grandTotalAmountForPurchaseInvoice,
            'Closing debit value at GL equals grand total amount for purchase invoice'
          );
          cy.log(`Closing debit value at GL is ${closingDebitValueAtGl} and grand total amount for purchase invoice is ${grandTotalAmountForPurchaseInvoice} and this is correct`);
        });
      });

      cy.get('@closingCreditValueAtGl').then((closingCreditValueAtGl) => {
        cy.get('@grandTotalAmountForPurchaseInvoice').then((grandTotalAmountForPurchaseInvoice) => {
          assertAmountContains(
            closingCreditValueAtGl,
            grandTotalAmountForPurchaseInvoice,
            'Closing credit value at GL equals grand total amount for purchase invoice'
          );
          cy.log(`Closing credit value at GL is ${closingCreditValueAtGl} and grand total amount for purchase invoice is ${grandTotalAmountForPurchaseInvoice} and this is correct`);
        });
      });
    });
  });
});
