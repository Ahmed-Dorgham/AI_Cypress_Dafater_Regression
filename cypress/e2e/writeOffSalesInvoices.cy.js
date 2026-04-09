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
  openPaymentEntryList,
  clickNewPrimaryAction,
  waitForOverlay,
  saveAndSubmitPaymentDoc,
  ensureSidebarVisible,
  applyAdvanceAmount,
  applyWriteOffAmount,
  applyWriteOffAmountNoWait,
  applyDiscountAmount,
  removeTaxesIfPresent,
  readOutstandingAmount,
  openCreateMenuAndChoose,
  selectCreditNoteReason,
} from '../support/migrationHelpers';
const LONG_TIMEOUT = 90000;

const startSalesInvoiceDraft = () => {
  startNewSalesInvoice();
};

const fillSalesInvoiceDraftCore = (itemCode) => {
  fillSalesInvoiceCore({ itemCode });
};

const saveSalesInvoiceDraft = () => {
  saveSalesInvoice();
};

const createDraftInvoice = (itemCode) => {
  startSalesInvoiceDraft();
  fillSalesInvoiceDraftCore(itemCode);
  saveSalesInvoiceDraft();
};

const loginToV5 = (env) => {
  login({ url: env.v5Url, username: env.user5, password: env.pass5 });
};

const createItemWithStandardSellingPrice = (itemCode, itemPrice) => {
  createItem(itemCode);
  addItemPriceStandardSelling(itemCode, itemPrice);
};

const createAndSaveSalesInvoice = (itemCode) => {
  createDraftInvoice(itemCode);
};

const createPreparedItem = (env = getMigrationEnv()) => {
  const itemCode = `item ${Date.now()}`;
  createItemWithStandardSellingPrice(itemCode, env.itemPrice);
  return cy.wrap(itemCode);
};

const createSalesInvoiceBeforeApplyWriteOff = (itemCode) => {
  createAndSaveSalesInvoice(itemCode);
};

const clickFirstVisibleForWriteOffSuite = (selectors, label, attempt = 0) =>
  cy.get('body', { timeout: 60000 }).then(($body) => {
    const target = $body.find(selectors.join(', ')).toArray().find((el) => {
      const $el = Cypress.$(el);
      return $el.is(':visible') && !$el.prop('disabled') && !$el.hasClass('disabled');
    });

    if (target) {
      return cy.wrap(target, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true });
    }

    if (attempt >= 10) {
      throw new Error(`Could not find ${label} using selectors: ${selectors.join(', ')}`);
    }

    const sidebarToggle = $body.find('#show-sidebar:visible, .sidebar-toggle-btn:visible').toArray()[0];
    if (sidebarToggle) {
      cy.wrap(sidebarToggle, { log: false }).click({ force: true });
    }

    return cy.wait(250, { log: false }).then(() =>
      clickFirstVisibleForWriteOffSuite(selectors, label, attempt + 1)
    );
  });

const clickFieldAndPickFirstOptionForWriteOffSuite = (selectors, label) => {
  const optionSelector =
    'ul.awesomplete li:visible, .awesomplete [role="option"]:visible, [role="listbox"] li:visible, [role="option"]:visible';

  const activateField = () =>
    cy.get('body', { timeout: 60000 }).then(($body) => {
      const target = $body.find(selectors.join(', ')).toArray().find((el) => {
        const $el = Cypress.$(el);
        return $el.is(':visible') && !$el.prop('disabled') && !$el.hasClass('disabled');
      });

      if (!target) return;

      const $target = Cypress.$(target);
      const isInputLike = $target.is('input, textarea') || String($target.attr('role') || '').toLowerCase() === 'combobox';

      let chain = cy.wrap(target, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true });

      if (isInputLike) {
        chain = chain.type('{downarrow}', { force: true });
      }

      return chain;
    });

  const scrollToField = (attempt = 0) =>
    cy.get('body', { timeout: 60000 }).then(($body) => {
      const visibleField = $body.find(selectors.join(', ')).toArray().find((el) => {
        const $el = Cypress.$(el);
        return $el.is(':visible') && !$el.prop('disabled') && !$el.hasClass('disabled');
      });

      const firstExistingField = $body.find(selectors.join(', ')).toArray()[0];
      const target = visibleField || firstExistingField;

      if (target) {
        return cy.wrap(target, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .wait(120, { log: false });
      }

      if (attempt >= 12) return;

      return cy.get('.layout-main-section:visible, .form-page:visible, .page-body:visible, body', { log: false })
        .first()
        .scrollTo('bottom', { ensureScrollable: false, log: false })
        .wait(180, { log: false })
        .then(() => scrollToField(attempt + 1));
    });

  const clickOption = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const field = $body.find(selectors.join(', ')).toArray().find((el) => {
        const $el = Cypress.$(el);
        return $el.is(':visible') && !$el.prop('disabled') && !$el.hasClass('disabled');
      }) || $body.find(selectors.join(', ')).toArray()[0];

      const ariaOwns = field ? String(Cypress.$(field).attr('aria-owns') || '').trim() : '';
      const ownedOptionSelector = ariaOwns
        ? `#${ariaOwns} [role="option"], #${ariaOwns} li, #${ariaOwns} div[role="option"]`
        : '';

      const ownedOptions = ownedOptionSelector ? $body.find(ownedOptionSelector).toArray() : [];
      const genericOptions = $body.find(optionSelector).toArray();
      const optionsPool = ownedOptions.length ? ownedOptions : genericOptions;
      const option = optionsPool.find((el) => Cypress.$(el).is(':visible')) || optionsPool[0];

      if (option) return cy.wrap(option, { log: false }).click({ force: true });
      if (attempt >= 20) throw new Error(`No options appeared for ${label}`);

      if (field) {
        return cy.wrap(field, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true })
          .type('{downarrow}', { force: true })
          .wait(1000, { log: false })
          .then(() => clickOption(attempt + 1));
      }

      return cy.wait(220, { log: false }).then(() => clickOption(attempt + 1));
    });

  return cy.scrollTo('top', { ensureScrollable: false, log: false })
    .then(() => scrollToField())
    .then(() => activateField())
    .then(() => scrollToField())
    .then(() => activateField())
    .then(() => clickOption());
};

const openPaymentEntryListPageForWriteOffSuite = () => {
  ensureSidebarVisible();
  clickFirstVisibleForWriteOffSuite(
    [
      '#module-anchor-Selling',
      '#module-anchor-selling',
      '[id*="module-anchor-Sell"]',
      'a[href="/app/selling"]',
      'a[href*="#module/Selling"]',
    ],
    'selling module tab'
  );
  waitForOverlay();
  clickFirstVisibleForWriteOffSuite(
    [
      '#sidebar-selling-receipt-vouchers',
      '[id*="sidebar-selling-receipt-vouchers"]',
      'a[href*="#List/Payment Entry"]',
      'a[href*="/app/payment-entry"]',
    ],
    'receipt vouchers option'
  );
  waitForOverlay();
};

const clickOnNewPaymentEntryBtnForWriteOffSuite = () => {
  waitForOverlay();
  clickNewPrimaryAction();
  waitForOverlay();
};

const enterValidDataIntoPaymentEntryPageForWriteOffSuite = (amount = 100) => {
  const amountValue = String(amount);

  cy.get('input#party[data-fieldtype="Dynamic Link"][data-fieldname="party"][data-target="party_type"], #party', {
    timeout: LONG_TIMEOUT,
  })
    .eq(1)
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .should('be.visible');

  clickFieldAndPickFirstOptionForWriteOffSuite(
    [
      'input#party[data-fieldtype="Dynamic Link"][data-fieldname="party"][data-target="party_type"]',
      'input#party[data-fieldname="party"]',
      'input[data-fieldname="party"][data-fieldtype="Dynamic Link"]',
      '#party',
      'input[data-fieldname="party"]',
      '#customer',
      'input[data-fieldname="customer"]',
    ],
    'receipt voucher customer field'
  );

  clickFieldAndPickFirstOptionForWriteOffSuite(
    [
      '#account',
      'input[data-fieldname="account"]',
      '#paid_to',
      'input[data-fieldname="paid_to"]', 
      'input[data-fieldname="account_paid_to"]',
      
    ],
    'receipt voucher account field'
  );

  cy.get('input#paid_amount[data-fieldtype="Currency"][data-fieldname="paid_amount"], #paid_amount', {
    timeout: LONG_TIMEOUT,
  })
    .eq(0)
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .should('exist')
    .click({ force: true })
    .focus()
    .type('{selectall}{del}', { force: true })
    .wait(5000, { log: false })
    .type(amountValue, { force: true });
};

const clickOnSaveAndSubmitPaymentEntryBtnForWriteOffSuite = () => {
  cy.get('body', { timeout: 60000 }).then(($body) => {
    const normalize = (v) =>
      String(v || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    const saveTextAr = normalize('\u062d\u0641\u0638');
    const saveSubmitTextAr = normalize('\u062d\u0641\u0638 \u0648\u0627\u0639\u062a\u0645\u0627\u062f');

    const target = $body
      .find('button:visible, .btn:visible, [role="button"]:visible, [id^="appframe-btn-"]:visible')
      .toArray()
      .find((el) => {
        const $el = Cypress.$(el);
        const text = normalize($el.text());
        const id = normalize($el.attr('id'));
        const action = normalize($el.attr('data-action_name') || $el.attr('data-action-name'));
        const cls = normalize($el.attr('class'));

        const isSubmit = text.includes(saveSubmitTextAr)
          || text.includes('submit')
          || action === 'submit'
          || cls.includes('save-submit-action')
          || id.includes('appframe-btn-submit');
        const isSaveOnly = text === saveTextAr || text === 'save' || action === 'save';

        return isSubmit && !isSaveOnly;
      });

    if (!target) {
      throw new Error('Could not find visible "حفظ واعتماد / Submit" button by text');
    }

    cy.wrap(target, { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true });
  });

  cy.contains(
    '.btn.btn-primary.btn-sm.btn-modal-primary:visible, .btn.btn-yes:visible, .modal-dialog:visible button:visible, .page-form:visible button:visible, .page-form:visible .btn:visible',
    /\u0646\u0639\u0645|yes/i,
    { timeout: 60000 }
  )
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true });

  waitForOverlay();
};

const createReceiptVoucherBeforeApplyWriteOffForWriteOffSuite = (amount = 100) => {
  openPaymentEntryList();
  clickNewPrimaryAction();
  waitForOverlay();
  enterValidDataIntoPaymentEntryPageForWriteOffSuite(amount);
  saveAndSubmitPaymentDoc(Date.now());
};



openPaymentEntryListPageForWriteOffSuite
const createPaymentEntryBeforeApplyWriteOffUsingSellingFlowForWriteOffSuite = (amount = 100) => {
  openPaymentEntryListPageForWriteOffSuite();
  clickOnNewPaymentEntryBtnForWriteOffSuite();
  enterValidDataIntoPaymentEntryPageForWriteOffSuite(amount);
  clickOnSaveAndSubmitPaymentEntryBtnForWriteOffSuite();
};



describe('WriteOffSalesInvoicesTest (Migrated from Selenium)', () => {
  let preparedItemCode;

  beforeEach(() => {
    const env = getMigrationEnv();
    loginToV5(env);

    if (preparedItemCode) return;

    createPreparedItem(env).then((itemCode) => {
      preparedItemCode = itemCode;
    });
  });

  it('TC01_createNewSalesInvoiceAndSaveAfterApplyCompleteWriteOff', () => {
    createSalesInvoiceBeforeApplyWriteOff(preparedItemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      const totalOutstandingAmountValueBeforeApplyWriteOff = String(beforeOutstanding).trim();
      cy.log(`total outstanding amount value before apply complete write off is ${totalOutstandingAmountValueBeforeApplyWriteOff}`);
      // eslint-disable-next-line no-console
      console.log(
        'total outstanding amount value before apply complete write off is',
        totalOutstandingAmountValueBeforeApplyWriteOff
      );

      applyWriteOffAmount(beforeOutstanding);
      saveSalesInvoice();

      readOutstandingAmount().then((afterOutstanding) => {
        const totalOutstandingAmountValueAfterApplyWriteOff = String(afterOutstanding).trim();
        cy.log(`total outstanding amount value after apply complete write off is ${totalOutstandingAmountValueAfterApplyWriteOff}`);
        // eslint-disable-next-line no-console
        console.log(
          'total outstanding amount value after apply complete write off is',
          totalOutstandingAmountValueAfterApplyWriteOff
        );

        const isAfterContainsBefore =
          totalOutstandingAmountValueAfterApplyWriteOff.includes(totalOutstandingAmountValueBeforeApplyWriteOff);
        cy.log(
          `assert compare => before: ${totalOutstandingAmountValueBeforeApplyWriteOff} | after: ${totalOutstandingAmountValueAfterApplyWriteOff} | after includes before: ${isAfterContainsBefore}`
        );
        // eslint-disable-next-line no-console
        console.log('assert compare =>', {
          before: totalOutstandingAmountValueBeforeApplyWriteOff,
          after: totalOutstandingAmountValueAfterApplyWriteOff,
          afterIncludesBefore: isAfterContainsBefore,
        });

        expect(
          isAfterContainsBefore,
          'after write-off outstanding should not contain before write-off outstanding'
        ).to.eq(false);
      });
    });
  });

  it('TC02_createNewSalesInvoiceWhenApplyWriteOffAndPayAdvanceAmountWithValueEqualToGrandTotalAmount', () => {
    const env = getMigrationEnv();

    createPaymentEntryBeforeApplyWriteOffUsingSellingFlowForWriteOffSuite(env.itemPrice);
    createAndSaveSalesInvoice(preparedItemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      const totalOutstandingAmountValueBeforeApplyWriteOff = String(beforeOutstanding).trim();
      cy.log(`total outstanding amount value before apply complete write off is ${totalOutstandingAmountValueBeforeApplyWriteOff}`);
      // eslint-disable-next-line no-console
      console.log(
        'total outstanding amount value before apply complete write off is',
        totalOutstandingAmountValueBeforeApplyWriteOff
      );

      const advanceAmount = beforeOutstanding / 2;
      const writeOffAmount = beforeOutstanding / 2;
      cy.log(`advance amount to apply is ${advanceAmount}`);
      cy.log(`write-off amount to apply is ${writeOffAmount}`);
      // eslint-disable-next-line no-console
      console.log('advance amount to apply is', advanceAmount);
      // eslint-disable-next-line no-console
      console.log('write-off amount to apply is', writeOffAmount);

      applyAdvanceAmount(advanceAmount);
      applyWriteOffAmount(writeOffAmount);
      saveSalesInvoice();

      readOutstandingAmount().then((afterOutstanding) => {
        const totalOutstandingAmountValueAfterApplyWriteOff = String(afterOutstanding).trim();
        cy.log(`total outstanding amount value after apply complete write off is ${totalOutstandingAmountValueAfterApplyWriteOff}`);
        // eslint-disable-next-line no-console
        console.log(
          'total outstanding amount value after apply complete write off is',
          totalOutstandingAmountValueAfterApplyWriteOff
        );

        const isAfterContainsBefore =
          totalOutstandingAmountValueAfterApplyWriteOff.includes(totalOutstandingAmountValueBeforeApplyWriteOff);
        cy.log(
          `assert compare => before: ${totalOutstandingAmountValueBeforeApplyWriteOff} | after: ${totalOutstandingAmountValueAfterApplyWriteOff} | after includes before: ${isAfterContainsBefore}`
        );
        // eslint-disable-next-line no-console
        console.log('assert compare =>', {
          before: totalOutstandingAmountValueBeforeApplyWriteOff,
          after: totalOutstandingAmountValueAfterApplyWriteOff,
          afterIncludesBefore: isAfterContainsBefore,
        });

        expect(
          isAfterContainsBefore,
          'after write-off outstanding should not contain before write-off outstanding'
        ).to.eq(false);
      });
    });
  });

  it('TC03_verifyValidationWhenPayAdvanceAmountFirstAndApplyWriteOffWithValueGreaterThanGrandTotalAmount', () => {
    const env = getMigrationEnv();
    createPaymentEntryBeforeApplyWriteOffUsingSellingFlowForWriteOffSuite(env.itemPrice);
    createAndSaveSalesInvoice(preparedItemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      const totalAmountValueBeforeApplyWriteOff = Number(beforeOutstanding);
      const totalOutstandingAmountValueBeforeApplyWriteOff = String(totalAmountValueBeforeApplyWriteOff).trim();
      const writeOffAmount = totalAmountValueBeforeApplyWriteOff / 2;

      cy.log(`total outstanding amount value before apply complete write off is ${totalOutstandingAmountValueBeforeApplyWriteOff}`);
      // eslint-disable-next-line no-console

      applyAdvanceAmount(totalAmountValueBeforeApplyWriteOff);
      applyWriteOffAmount(writeOffAmount);
    

      cy.get('.msgprint', { timeout: 60000 })
        .should('be.visible')
        .invoke('text')
        .then((validationMsgText) => {
          const validationMsg = String(validationMsgText || '').replace(/\s+/g, ' ').trim();
          cy.log(
            'Validation Msg after Pay Advance Amount First And Apply Write Off Greater Than Grand Total Amount is',
            validationMsg
          );

          expect(validationMsg).to.contain('0.000');
          expect(validationMsg).to.contain('\u0645\u0628\u0644\u063a \u0627\u0644\u0634\u0637\u0628');
        });
    });
  });

  it('TC05_verifyValidationWhenApplyDiscountAndApplyWriteOffWithValueGreaterThanGrandTotalAmount', () => {
    cy.on('window:before:load', (win) => {
      cy.stub(win, 'open').as('windowOpen');
    });

    createAndSaveSalesInvoice(preparedItemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      const totalAmountValueBeforeApplyWriteOff = Number(beforeOutstanding);
      const halfAmount = totalAmountValueBeforeApplyWriteOff / 2;

      applyDiscountAmount(halfAmount);
      applyWriteOffAmount(totalAmountValueBeforeApplyWriteOff);

      cy.get('.msgprint', { timeout: 60000 })
        .should('be.visible')
        .invoke('text')
        .then((validationMsgText) => {
          const validationMsg = String(validationMsgText || '').replace(/\s+/g, ' ').trim();

          cy.log(`Validation message after TC05: ${validationMsg}`);
          // eslint-disable-next-line no-console
          console.log(
            'Validation Msg after Apply discount And Apply Write off With Value Greater Than Grand Total Amount is',
            validationMsg
          );

          expect(validationMsg).to.contain(String(halfAmount));
          expect(validationMsg).to.contain('\u0645\u0628\u0644\u063a \u0627\u0644\u0634\u0637\u0628');
        });
    });
  });

  it('TC06_verifyValidationWhenApplyWriteOffWithNegative', () => {
    createDraftInvoice(preparedItemCode);

    applyWriteOffAmount(-100);
    // saveSalesInvoice();
    cy.get('.msgprint', { timeout: 30000 })
      .should('be.visible')
      .invoke('text')
      .then((validationMsgText) => {
        const validationMsg = String(validationMsgText || '').replace(/\s+/g, ' ').trim();
        cy.log(`Validation message after TC06: ${validationMsg}`);
        // eslint-disable-next-line no-console
        console.log('Validation Msg after Apply Write Off With Negative is', validationMsg);
        expect(validationMsg).to.contain('\u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0645\u0628\u0644\u063a \u0627\u0644\u0634\u0637\u0628 \u0633\u0627\u0644\u0628\u064b\u0627. \u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0642\u064a\u0645\u0629 \u0645\u0648\u062c\u0628\u0629.');
      });
  });

  it('TC07_verifyValidationWhenApplyCompleteWriteOffThenRemoveTaxes', () => {
    createDraftInvoice(preparedItemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      applyWriteOffAmountNoWait(beforeOutstanding);
      removeTaxesIfPresent();
      saveSalesInvoice();
      cy.get('.msgprint', { timeout: 60000 })
        .should('be.visible')
        .invoke('text')
        .then((validationMsgText) => {
          const validationMsg = String(validationMsgText || '').replace(/\s+/g, ' ').trim();
          cy.log(`Validation message after TC07: ${validationMsg}`);
          // eslint-disable-next-line no-console
          console.log('Validation Msg after Apply Complete Write Off Then Remove Taxes is', validationMsg);
          expect(validationMsg).to.not.equal('');
        });
    });
  });

  it('TC08_verifyValidationWhenApplyCompleteWriteOffAndDiscountThenRemoveTaxes', () => {
    createDraftInvoice(preparedItemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      applyDiscountAmount(beforeOutstanding / 2);
      applyWriteOffAmount(beforeOutstanding / 2);
      removeTaxesIfPresent();
      saveSalesInvoice();
      cy.get('.msgprint', { timeout: 60000 })
        .should('be.visible')
        .invoke('text')
        .then((validationMsgText) => {
          const validationMsg = String(validationMsgText || '').replace(/\s+/g, ' ').trim();
          cy.log(`Validation message after TC08: ${validationMsg}`);
          // eslint-disable-next-line no-console
          console.log('Validation Msg after Apply Complete Write Off And Discount Then Remove Taxes is', validationMsg);
          expect(validationMsg).to.contain('\u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0633\u062a\u062d\u0642 \u0633\u0627\u0644\u0628\u064b\u0627. \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629: -');
        });
    });
  });

  it('TC09_verifyWhenCreateCreditNoteAfterApplyWriteOffAndRemoveTaxesOnSalesInvoice', () => {
    createDraftInvoice(preparedItemCode);

    readOutstandingAmount().then((beforeOutstanding) => {
      applyWriteOffAmount(beforeOutstanding / 2);
      removeTaxesIfPresent();
            submitSalesInvoice();
   openCreateMenuAndChoose(['مرتجع / اشعار دائن', 'credit']);
      selectCreditNoteReason();
  
      submitSalesInvoice();
      cy.get('.label.label-success, .indicator-pill.no-indicator-dot.whitespace-nowrap.green', { timeout: 30000 })
        .should('exist')
        .invoke('text')
        .then((statusText) => {
          const actualStatus = String(statusText || '').replace(/\s+/g, ' ').trim();
          cy.log(`Credit Note status value: ${actualStatus}`);
          // eslint-disable-next-line no-console
          console.log('Credit Note status value:', actualStatus);
         expect(actualStatus).to.eq('معتمد')
        });
    });
  });
});


