const LONG_TIMEOUT = 60000;
const OVERLAY = '.freeze-message-container';
const FULL_SCREEN_TEXT_RE = /\u0639\u0631\u0636\s*\u0627\u0644\u0634\u0627\u0634\u0629\s*\u0643\u0627\u0645\u0644\u0629|full\s*screen/i;

const clickFirstExisting = (selectors, label) => {
  const combined = selectors.join(', ');
  cy.get(combined, { timeout: LONG_TIMEOUT }).then(($els) => {
    const target = $els.toArray().find((el) => {
      const $el = Cypress.$(el);
      return $el.is(':visible') && !$el.prop('disabled') && !$el.hasClass('disabled');
    }) || $els[0];

    if (!target) {
      throw new Error(`Could not find ${label} using selectors: ${combined}`);
    }
    cy.wrap(target, { log: false }).click({ force: true });
  });
};

const typeFirstExisting = (selectors, value, label) => {
  const combined = selectors.join(', ');
  cy.get(combined, { timeout: LONG_TIMEOUT }).then(($els) => {
    const target = $els.toArray().find((el) => {
      const $el = Cypress.$(el);
      return $el.is(':visible') && !$el.prop('disabled') && !$el.hasClass('disabled');
    }) || $els[0];

    if (!target) {
      throw new Error(`Could not find ${label} using selectors: ${combined}`);
    }
    cy.wrap(target, { log: false }).clear({ force: true }).type(String(value), { force: true });
  });
};

const pickFirstDynamicOption = (selectors, value, label) => {
  const combined = selectors.join(', ');
  const OPTIONS_INITIAL_WAIT_MS = 1200;
  const OPTIONS_RETRY_WAIT_MS = 400;
  const OPTIONS_MAX_ATTEMPTS = 40;
  const resolveVisibleTarget = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const found = $body.find(combined).toArray();
      const visibleTarget = found.find((el) => {
        const $el = Cypress.$(el);
        return $el.is(':visible') && !$el.prop('disabled') && !$el.hasClass('disabled');
      });

      if (visibleTarget) return visibleTarget;
      if (attempt >= OPTIONS_MAX_ATTEMPTS) {
        throw new Error(`Could not find visible ${label} using selectors: ${combined}`);
      }
      if (found.length) {
        const $raw = Cypress.$(found[0]);
        const anchor = $raw.closest('.frappe-control, .grid-row, .grid-body, .section-body, .form-layout, .form-page')[0]
          || $raw.parents(':visible').last()[0]
          || found[0];
        return cy
          .wrap(anchor, { log: false })
          .scrollIntoView({ offset: { top: -140, left: 0 } })
          .wait(OPTIONS_RETRY_WAIT_MS, { log: false })
          .then(() => resolveVisibleTarget(attempt + 1));
      }
      return cy.wait(OPTIONS_RETRY_WAIT_MS, { log: false }).then(() => resolveVisibleTarget(attempt + 1));
    });

  return resolveVisibleTarget().then((target) => {
    const clickFirstOption = (attempt = 0) =>
      cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        const $target = Cypress.$(target);
        const dataTarget = $target.attr('data-target');

        const byDataTarget = dataTarget
          ? $body.find(`[data-target="${dataTarget}"] + ul li:visible, [data-target="${dataTarget}"] ~ ul li:visible`)
          : Cypress.$();
        const fallback = $body.find(
          'ul.awesomplete li:visible, .awesomplete [role="option"]:visible, .awesomplete li:visible, [role="listbox"] li:visible, [role="option"]:visible'
        );
        const options = byDataTarget.length ? byDataTarget : fallback;

        if (options.length) {
          return cy.wrap(options[0], { log: false }).click({ force: true });
        }

        if (attempt >= OPTIONS_MAX_ATTEMPTS) {
          const waitedMs = OPTIONS_INITIAL_WAIT_MS + (OPTIONS_RETRY_WAIT_MS * OPTIONS_MAX_ATTEMPTS);
          throw new Error(`No options appeared for ${label} after waiting ${waitedMs}ms`);
        }
        return cy.wait(OPTIONS_RETRY_WAIT_MS, { log: false }).then(() => clickFirstOption(attempt + 1));
      });

    let chain = cy.wrap(target, { log: false }).scrollIntoView().click({ force: true });
    if (value !== undefined && value !== null && String(value) !== '') {
      chain = chain.clear({ force: true }).type(String(value), { force: true });
    }
    return chain
      .type('{downarrow}', { force: true })
      .wait(OPTIONS_INITIAL_WAIT_MS, { log: false })
      .then(() => clickFirstOption());
  });
};

export const getMigrationEnv = () => ({
  v4Url: Cypress.env('DAFATER_V4_URL') || 'https://almorished-v4.dafater.biz/index.html',
  v5Url: Cypress.env('DAFATER_V5_URL') || 'http://temp-qc-tmp.dafater.biz/#login',
  user4: Cypress.env('DAFATER_USER_4') || 'Administrator',
  pass4: Cypress.env('DAFATER_PASS_4') || 'cAAscAAxhv7N',
  user5: Cypress.env('DAFATER_USER_5') || 'Administrator',
  pass5: Cypress.env('DAFATER_PASS_5') || 'AsDedpoEweWwerd',
  itemPrice: Cypress.env('DAFATER_ITEM_PRICE') || '100',
});

export const waitForOverlay = () => {
  return cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    if ($body.find(OVERLAY).length) {
      return cy.get(OVERLAY, { timeout: LONG_TIMEOUT }).should('not.exist');
    }
  });
};

export const parseLastNumber = (value) => {
  const numbers = String(value)
    .replace(/[^0-9 .-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!numbers.length) return 0;
  return Number(numbers[numbers.length - 1]);
};

export const normalizeNumStr = (v) => String(v).replace(/,/g, '').trim();

export const login = ({ url, username, password }) => {
  cy.visit(url);
  cy.get('#login_email, #login_id', { timeout: LONG_TIMEOUT }).should('be.visible').clear({ force: true }).type(username, { force: true });
  cy.get('#login_password, #pass', { timeout: LONG_TIMEOUT }).should('be.visible').clear({ force: true }).type(password, { force: true });
  cy.get('#login_btn', { timeout: LONG_TIMEOUT }).click({ force: true });
  waitForOverlay();
  closeWelcomeIfPresent();
};

export const closeWelcomeIfPresent = () => {
  cy.get('body').then(($body) => {
    const closeBtn = $body.find('.modal.scroll-styler.in .modal-header .close');
    if (closeBtn.length) {
      cy.wrap(closeBtn[0]).click({ force: true });
      waitForOverlay();
    }
  });
};

export const ensureSidebarVisible = () => {
  cy.get('body').then(($body) => {
    if ($body.find('#show-sidebar').length) {
      cy.get('#show-sidebar').first().click({ force: true });
    }
  });
};

export const clickNewPrimaryAction = () => {
  waitForOverlay();
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const candidateSelector = '.toolbar .btn, .btn.toolbar-btn, .primary-action.toolbar-btn, [id^="appframe-btn-"], [data-action-name], [data-action_name], .dropdown-item, [role="menuitem"], button, a';
    const genericSelector = '.toolbar .btn:visible, .btn.toolbar-btn:visible, .primary-action.toolbar-btn:visible, [id^="appframe-btn-"]:visible';
    const candidates = $body
      .find(candidateSelector)
      .toArray()
      .filter((el) => {
        const $el = Cypress.$(el);
        return $el.is(':visible') && !$el.prop('disabled') && !$el.hasClass('disabled');
      });

    const normalize = (value) =>
      String(value || '')
        .replace(/[???]/g, '?')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    const decodeLabel = (value) => {
      try {
        return decodeURIComponent(String(value || ''));
      } catch (e) {
        return String(value || '');
      }
    };
    const preferredDocPattern = /\u0625?\u0636\u0627\u0641(?:\u0629|\u0647)\s*\u0633\u0646\u062f\s*\u062a\u0633\u0644\u064a\u0645|\u0625?\u0636\u0627\u0641(?:\u0629|\u0647)\s*\u0633\u0646\u062f\s*\u0625?\u0633\u062a\u0644\u0627\u0645|\u0625?\u0636\u0627\u0641(?:\u0629|\u0647)\s*\u0627\u064a\u0635\u0627\u0644\s*\u0627\u0633\u062a\u0644\u0627\u0645|add\s*delivery\s*note|add\s*purchase\s*receipt/i;
    const includeLabels = [
      'new',
      'create',
      'add',
      '\u0627\u0646\u0634\u0627\u0621',
      '\u0625\u0646\u0634\u0627\u0621',
      '\u0627\u0636\u0627\u0641\u0629',
      '\u0625\u0636\u0627\u0641\u0629',
      '\u062c\u062f\u064a\u062f',
    ];
    const excludeLabels = [
      'save',
      'submit',
      '\u062d\u0641\u0638',
      '\u0627\u0639\u062a\u0645\u0627\u062f',
    ];

    const clickPreferredDocByText = (attempt = 0) =>
      cy.get('body', { timeout: LONG_TIMEOUT }).then(($ctx) => {
        const byText = $ctx
          .find(candidateSelector)
          .toArray()
          .find((el) => {
            const $el = Cypress.$(el);
            if (!$el.is(':visible') || $el.prop('disabled') || $el.hasClass('disabled')) return false;
            const text = normalize($el.text());
            const dataLabel = normalize(decodeLabel($el.attr('data-label')));
            return preferredDocPattern.test(text) || preferredDocPattern.test(dataLabel);
          });

        if (byText) {
          return cy.wrap(byText, { log: false }).scrollIntoView().click({ force: true }).then(() => true);
        }

        if (attempt >= 6) return false;
        return cy.wait(300, { log: false }).then(() => clickPreferredDocByText(attempt + 1));
      });

    const clickAndHandle = ($target) => {
      return cy.wrap($target, { log: false }).scrollIntoView().click({ force: true }).then(() => {
        // Some pages render "Full Screen" a moment after clicking Create/New.
        return clickFullScreenIfPresent();
      });
    };

    return clickPreferredDocByText().then((preferredClicked) => {
      if (preferredClicked) return;

      const target = candidates.find((el) => {
        const $el = Cypress.$(el);
        const text = normalize($el.text());
        const id = normalize($el.attr('id'));
        const action = normalize($el.attr('data-action-name') || $el.attr('data-action_name'));
        const haystack = `${text} ${id} ${action}`;
        return includeLabels.some((label) => haystack.includes(normalize(label))) && !excludeLabels.some((label) => haystack.includes(normalize(label)));
      }) || candidates.find((el) => Cypress.$(el).is('.primary-action.toolbar-btn'));

      if (target) {
        return clickAndHandle(target);
      }

      // Retryable fallback for pages where toolbar renders late or with different structure.
      return cy
        .contains(
          genericSelector,
          /new|create|add|\u0627\u0646\u0634\u0627\u0621|\u0625\u0646\u0634\u0627\u0621|\u0627\u0636\u0627\u0641\u0629|\u0625\u0636\u0627\u0641\u0629|\u062c\u062f\u064a\u062f/i,
          {
          timeout: LONG_TIMEOUT,
          }
        )
        .first()
        .then(($el) => clickAndHandle($el));
    });
  });
};

const getVisibleFullScreenButton = ($body) =>
  $body
    .find('button:visible, a:visible, .btn:visible, [role="button"]:visible')
    .toArray()
    .find((el) => {
      const text = String(Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim();
      return FULL_SCREEN_TEXT_RE.test(text);
    });

const clickFullScreenAndEnsureHidden = ({ required = false, searchAttempts = 12, clickAttempts = 8 } = {}) => {
  const waitForButton = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const target = getVisibleFullScreenButton($body);

      if (target) return target;

      if (attempt >= searchAttempts) {
        if (required) {
          throw new Error('Full-screen button did not appear');
        }
        return null;
      }

      return cy.wait(250, { log: false }).then(() => waitForButton(attempt + 1));
    });

  const clickUntilGone = (clickAttempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const target = getVisibleFullScreenButton($body);
      if (!target) return;

      if (clickAttempt >= clickAttempts) {
        throw new Error('Full-screen button is still visible after clicking');
      }

      return cy.wrap(target, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true })
        .then(() => waitForOverlay())
        .wait(200, { log: false })
        .then(() => clickUntilGone(clickAttempt + 1));
    });

  return waitForButton(0).then((target) => {
    if (!target) return;
    return clickUntilGone(0);
  });
};

export const clickFullScreenIfPresent = () =>
  clickFullScreenAndEnsureHidden({ required: false });

const hasItemEntryFieldsVisible = ($body) =>
  $body.find(
    'input[data-fieldname="item_code"]:visible, #item_code:visible, input[data-fieldname="price_list"]:visible, input[data-fieldname="price_list_rate"]:visible'
  ).length > 0;

const closeUnexpectedWindowIfPresent = (attempt = 0) =>
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const hasPopup = $body.find('.modal-dialog:visible, .msgprint:visible').length > 0;
    if (!hasPopup) return;

    const closeTarget = $body
      .find('.modal-dialog:visible .close:visible, .modal-dialog:visible [data-dismiss="modal"]:visible, .msgprint:visible .close:visible')
      .toArray()[0];

    if (closeTarget) {
      return cy.wrap(closeTarget, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true })
        .then(() => waitForOverlay())
        .then(() => closeUnexpectedWindowIfPresent(attempt + 1));
    }

    const actionTarget = $body
      .find('.modal-dialog:visible button:visible, .modal-dialog:visible .btn:visible, .msgprint:visible button:visible, .msgprint:visible .btn:visible')
      .toArray()
      .find((el) => {
        const txt = String(Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim().toLowerCase();
        return /اغلاق|إغلاق|close|cancel|ok|موافق|لا|no/i.test(txt);
      });

    if (actionTarget) {
      return cy.wrap(actionTarget, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true })
        .then(() => waitForOverlay())
        .then(() => closeUnexpectedWindowIfPresent(attempt + 1));
    }

    if (attempt >= 5) return;

    return cy.get('body', { log: false })
      .type('{esc}', { force: true })
      .wait(180, { log: false })
      .then(() => closeUnexpectedWindowIfPresent(attempt + 1));
  });

const clickAddItemButtonIfPresent = () =>
  closeUnexpectedWindowIfPresent().then(() => cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const addItemPattern = /\u0625?\u0636\u0627\u0641(?:\u0629|\u0647)\s*\u0635\u0646\u0641|add\s*item/i;
    const excludePattern = /\u0633\u0639\u0631|price/i;
    const target = $body
      .find('button:visible, a:visible, .btn:visible, [role="button"]:visible, .dropdown-item:visible, [role="menuitem"]:visible')
      .toArray()
      .find((el) => {
        const $el = Cypress.$(el);
        const text = String($el.text() || '').replace(/\s+/g, ' ').trim();
        return addItemPattern.test(text) && !excludePattern.test(text);
      });

    if (!target) return false;

    return cy.wrap(target, { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true })
      .then(() => waitForOverlay().then(() => true));
  }));

export const clickFullScreenRequired = () => {
  return cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    if (hasItemEntryFieldsVisible($body)) {
      Cypress.log({ name: 'clickFullScreenRequired', message: 'already opened' });
      return;
    }
  })
    .then(() => clickFullScreenAndEnsureHidden({ required: false }))
    .then(() => cy.get('body', { timeout: LONG_TIMEOUT }))
    .then(($body) => {
      if (hasItemEntryFieldsVisible($body)) return;
      return clickAddItemButtonIfPresent();
    })
    .then(() => cy.get('body', { timeout: LONG_TIMEOUT }))
    .then(($body) => {
      if (hasItemEntryFieldsVisible($body)) return;
      return clickFullScreenAndEnsureHidden({ required: true });
    });
};
export const openItemsList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Stock'], 'Stock module');
  clickFirstExisting(['#sidebar-stock-item'], 'Items sidebar');
  waitForOverlay();
};

export const openWarehousesList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Stock'], 'Stock module');
  clickFirstExisting(['#sidebar-stock-warehouse'], 'Warehouse sidebar');
  waitForOverlay();
};

export const openStockEntriesList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Stock'], 'Stock module');
  clickFirstExisting(['#sidebar-stock-stock-entry'], 'Stock Entry sidebar');
  waitForOverlay();
};

export const openPurchaseReceiptsList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Stock'], 'Stock module');
  clickFirstExisting(['#sidebar-stock-purchase-receipt'], 'Purchase Receipt sidebar');
  waitForOverlay();
};

export const openDeliveryNotesList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Stock'], 'Stock module');
  clickFirstExisting(['#sidebar-stock-delivery-note'], 'Delivery Note sidebar');
  waitForOverlay();
};

export const selectDeliveryNoteCustomer = () => {
  const customerFieldSelector = '#customer, input[data-fieldname="customer"]';
  cy.get(customerFieldSelector, { timeout: LONG_TIMEOUT })
    .filter(':visible')
    .first()
    .as('deliveryNoteCustomerField');

  cy.get('@deliveryNoteCustomerField')
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true })
    .type('{downarrow}', { force: true });

  cy.get('@deliveryNoteCustomerField').should(($input) => {
    const expanded = String($input.attr('aria-expanded') || '').toLowerCase() === 'true';
    const focused = Cypress.dom.isFocused($input[0]);
    expect(expanded || focused, 'customer field activated').to.eq(true);
  });

  cy.get('@deliveryNoteCustomerField').then(($input) => {
    const dataTarget = $input.attr('data-target');
    const dataTargetSelector = dataTarget
      ? `[data-target="${dataTarget}"] + ul li:visible, [data-target="${dataTarget}"] ~ ul li:visible`
      : '';
    const fallbackSelector =
      'ul.awesomplete li:visible, .awesomplete [role="option"]:visible, .awesomplete li:visible, [role="listbox"] li:visible, [role="option"]:visible';
    const optionSelectors = [dataTargetSelector, fallbackSelector].filter(Boolean).join(', ');

    const clickFirstCustomerOption = (attempt = 0) =>
      cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        const opts = $body.find(optionSelectors);
        if (opts.length) {
          return cy.wrap(opts[0], { log: false }).click({ force: true });
        }

        if (attempt >= 20) {
          throw new Error('Customer options appeared briefly but could not click the first option');
        }

        return cy
          .get('@deliveryNoteCustomerField', { log: false })
          .type('{downarrow}', { force: true })
          .wait(180, { log: false })
          .then(() => clickFirstCustomerOption(attempt + 1));
      });

    return clickFirstCustomerOption();
  });
};

export const selectDeliveryNoteItem = (itemName) => {
  const normalizedItemName = String(itemName || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const itemStaticCellSelectors = [
    '.form-grid-container .grid-body .rows .grid-row:visible:first .col.grid-static-col.col-xs-4[data-fieldname="item_code"] .static-area',
    '.form-grid-container .grid-body .rows .grid-row:visible:first .col.grid-static-col.col-xs-4[data-fieldname="item_code"]',
    '.form-grid-container .grid-body .rows .grid-row:visible:first .grid-static-col[data-fieldname="item_code"] .static-area',
    '.form-grid-container .grid-body .rows .grid-row:visible:first .grid-static-col[data-fieldname="item_code"]',
    '.form-grid-container .grid-body .rows .grid-row:visible:first [data-fieldname="item_code"] .static-area',
    '.form-grid-container .grid-body .rows .grid-row:visible:first [data-fieldname="item_code"]',
  ];
  const rowItemInputSelectors = [
    '.form-grid-container .grid-body .rows .grid-row:visible:first input[data-fieldname="item_code"]:visible',
    '.form-grid-container .grid-body .rows .grid-row:visible:first input[data-target="Item"]:visible',
    '.form-grid-container .grid-body .rows .grid-row:visible:first #item_code:visible',
  ];
  const fallbackItemInputSelectors = [
    '[data-fieldname="items"] input[data-fieldname="item_code"]:visible',
    '[data-fieldname="items"] input[data-target="Item"]:visible',
    '.form-grid input[data-fieldname="item_code"]:visible',
    '.form-grid input[data-target="Item"]:visible',
    'input[data-fieldname="item_code"]:visible',
    'input[data-target="Item"]:visible',
    '#item_code:visible',
  ];

  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const $scope = $body.find('.layout-main-section:visible, .form-page:visible').first();
    const searchRoot = $scope.length ? $scope : $body;
    const scrollTarget = searchRoot.find(
      '[data-fieldname="items"]:visible, .form-grid:visible, .grid-body:visible, [data-fieldname="item_code"]:visible, [data-target="Item"]:visible'
    )[0];

    if (scrollTarget) {
      cy.wrap(scrollTarget, { log: false }).scrollIntoView({ offset: { top: -180, left: 0 } });
    } else {
      cy.scrollTo('bottom', { ensureScrollable: false, log: false });
    }
  });

  const activateDeliveryNoteItemInput = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const $scope = $body.find('.layout-main-section:visible, .form-page:visible').first();
      const searchRoot = $scope.length ? $scope : $body;
      const scrollTarget = searchRoot.find(
        '[data-fieldname="items"]:visible, .form-grid:visible, .grid-body:visible, [data-fieldname="item_code"]:visible, [data-target="Item"]:visible'
      )[0];

      if (scrollTarget) {
        cy.wrap(scrollTarget, { log: false }).scrollIntoView({ offset: { top: -180, left: 0 } });
      }

      const staticTarget = searchRoot
        .find(itemStaticCellSelectors.join(', '))
        .toArray()
        .find((el) => Cypress.$(el).is(':visible'));
      const rowInputTarget = searchRoot
        .find(rowItemInputSelectors.join(', '))
        .toArray()
        .find((el) => Cypress.$(el).is(':visible'));
      const fallbackInputTarget = searchRoot
        .find(fallbackItemInputSelectors.join(', '))
        .toArray()
        .find((el) => Cypress.$(el).is(':visible'));
      const inputTarget = rowInputTarget || fallbackInputTarget;

      if (staticTarget) {
        cy.wrap(staticTarget, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true })
          .dblclick({ force: true });
      }

      if (inputTarget) {
        return cy.wrap(inputTarget, { log: false });
      }

      if (attempt >= 25) {
        throw new Error(
          `Could not find visible delivery note item input using selectors: ${rowItemInputSelectors.concat(fallbackItemInputSelectors).join(', ')}`
        );
      }

      return cy
        .wait(220, { log: false })
        .then(() => activateDeliveryNoteItemInput(attempt + 1));
    });

  activateDeliveryNoteItemInput().then((inputTarget) => {
    cy.wrap(inputTarget, { log: false })
      .as('deliveryNoteItemField')
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true })
      .clear({ force: true })
      .type(String(itemName), { force: true });

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
          return normalizedItemName ? text.includes(normalizedItemName) : false;
        });

        if (matchingOpt) {
          return cy.wrap(matchingOpt, { log: false }).click({ force: true });
        }

        if (attempt >= 20) {
          throw new Error(`Delivery note item options appeared but no option matched item code: ${String(itemName)}`);
        }

        return cy
          .get('@deliveryNoteItemField', { log: false })
          .type('{downarrow}', { force: true })
          .wait(180, { log: false })
          .then(() => clickMatchingItemOption(attempt + 1));
      });

    return clickMatchingItemOption();
  });
};
export const enterValidDataIntoDeliveryNotePage = (itemName) => {
  fillDeliveryNoteCore(itemName);
  saveAndSubmitDeliveryNote();
};

export const fillDeliveryNoteCore = (itemName) => {
  waitForOverlay();
  selectDeliveryNoteCustomer();
  selectDeliveryNoteItem(itemName);
};

export const saveAndSubmitDeliveryNote = () => {
  saveAndSubmit();
};

export const saveAndSubmit = () => {
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const normalize = (v) =>
      String(v || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    const decodeLabel = (v) => {
      try {
        return decodeURIComponent(String(v || ''));
      } catch (e) {
        return String(v || '');
      }
    };

    const candidates = $body
      .find('button:visible, .btn:visible, [role="button"]:visible, [id^="appframe-btn-"]:visible')
      .toArray();

    let target = candidates.find((el) => {
      const cls = normalize(Cypress.$(el).attr('class'));
      return cls.includes('save-submit-action');
    });

    if (!target) {
      target = candidates.find((el) => {
        const $el = Cypress.$(el);
        const text = normalize($el.text());
        const dataLabel = normalize(decodeLabel($el.attr('data-label')));
        const action = normalize($el.attr('data-action_name') || $el.attr('data-action-name'));

        const byText = /\u062d\u0641\u0638\s*\u0648?\s*\u0627\u0639\u062a\u0645\u0627\u062f|save\s*and\s*submit/i.test(text)
          || /\u062d\u0641\u0638\s*\u0648?\s*\u0627\u0639\u062a\u0645\u0627\u062f|save\s*and\s*submit/i.test(dataLabel);
        return byText || action === 'submit';
      });
    }

    if (!target) {
      throw new Error('Could not find visible "Save and Submit" button');
    }

    cy.wrap(target, { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true });
  });

  cy.contains(
    '.btn.btn-primary.btn-sm.btn-modal-primary:visible, .btn.btn-yes:visible, .modal-dialog:visible button:visible',
    /\u0646\u0639\u0645|yes/i,
    { timeout: LONG_TIMEOUT }
  )
    .first()
    .click({ force: true });
};

export const Saveandsubmit = saveAndSubmit;

export const selectPurchaseReceiptSupplier = () => {
  const supplierFieldSelector = '#supplier, input[data-fieldname="supplier"]';
  cy.get(supplierFieldSelector, { timeout: LONG_TIMEOUT })
    .filter(':visible')
    .first()
    .as('purchaseReceiptSupplierField');

  cy.get('@purchaseReceiptSupplierField')
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true })
    .type('{downarrow}', { force: true });

  cy.get('@purchaseReceiptSupplierField').then(($input) => {
    const dataTarget = $input.attr('data-target');
    const dataTargetSelector = dataTarget
      ? `[data-target="${dataTarget}"] + ul li:visible, [data-target="${dataTarget}"] ~ ul li:visible`
      : '';
    const fallbackSelector =
      'ul.awesomplete li:visible, .awesomplete [role="option"]:visible, .awesomplete li:visible, [role="listbox"] li:visible, [role="option"]:visible';
    const optionSelectors = [dataTargetSelector, fallbackSelector].filter(Boolean).join(', ');

    const clickFirstSupplierOption = (attempt = 0) =>
      cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        const opts = $body.find(optionSelectors);
        if (opts.length) {
          return cy.wrap(opts[0], { log: false }).click({ force: true });
        }

        if (attempt >= 20) {
          throw new Error('Supplier options appeared briefly but could not click the first option');
        }

        return cy
          .get('@purchaseReceiptSupplierField', { log: false })
          .type('{downarrow}', { force: true })
          .wait(180, { log: false })
          .then(() => clickFirstSupplierOption(attempt + 1));
      });

    return clickFirstSupplierOption();
  });
};

export const selectPurchaseReceiptItem = (itemCode) => {
  const normalizedItemCode = String(itemCode || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const itemStaticCellSelectors = [
    '.form-grid-container .grid-body .rows .grid-row:visible:first .col.grid-static-col.col-xs-4[data-fieldname="item_code"] .static-area',
    '.form-grid-container .grid-body .rows .grid-row:visible:first .col.grid-static-col.col-xs-4[data-fieldname="item_code"]',
    '.form-grid-container .grid-body .rows .grid-row:visible:first [data-fieldname="item_code"] .static-area',
    '.form-grid-container .grid-body .rows .grid-row:visible:first [data-fieldname="item_code"]',
  ];
  const rowItemInputSelectors = [
    '.form-grid-container .grid-body .rows .grid-row:visible:first input[data-fieldname="item_code"]:visible',
    '.form-grid-container .grid-body .rows .grid-row:visible:first input[data-target="Item"]:visible',
    '.form-grid-container .grid-body .rows .grid-row:visible:first #item_code:visible',
  ];

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

  clickFirstExisting(itemStaticCellSelectors, 'Purchase receipt item code static cell (row)');
  cy.get(itemStaticCellSelectors.join(', '), { timeout: 120000 }).then(($cells) => {
    const cellTarget = $cells.toArray().find((el) => Cypress.$(el).is(':visible')) || $cells[0];
    if (!cellTarget) {
      throw new Error(`Could not find item static cell using selectors: ${itemStaticCellSelectors.join(', ')}`);
    }
    cy.wrap(cellTarget, { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true })
      .dblclick({ force: true });
  });

  cy.get(rowItemInputSelectors.join(', '), { timeout: 120000 })
    .then(($inputs) => {
      const inputTarget = $inputs.toArray().find((el) => Cypress.$(el).is(':visible')) || $inputs[0];
      if (!inputTarget) {
        throw new Error(`Could not find visible item input using selectors: ${rowItemInputSelectors.join(', ')}`);
      }
      cy.wrap(inputTarget, { log: false })
        .as('purchaseReceiptItemField')
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

      const clickFirstItemOption = (attempt = 0) =>
        cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
          const opts = $body.find(optionSelectors).toArray();
          const matchingOpt = opts.find((el) => {
            const text = (Cypress.$(el).text() || '').toLowerCase().replace(/\s+/g, ' ').trim();
            return normalizedItemCode ? text.includes(normalizedItemCode) : false;
          });

          if (matchingOpt) {
            return cy.wrap(matchingOpt, { log: false }).click({ force: true });
          }

          if (attempt >= 20) {
            throw new Error(`Item options appeared but no option matched item code: ${String(itemCode)}`);
          }

          return cy
            .get('@purchaseReceiptItemField', { log: false })
            .type('{downarrow}', { force: true })
            .wait(180, { log: false })
            .then(() => clickFirstItemOption(attempt + 1));
        });

      return clickFirstItemOption();
    });
};

export const saveAndSubmitPurchaseReceipt = () => {
  clickFirstExisting(
    ['#purchase-receipt-__details-tab', 'a[data-fieldname="__details"][href="#purchase-receipt-__details"]'],
    'Purchase receipt details tab'
  );
  cy.get('#purchase-receipt-__details-tab, a[data-fieldname="__details"][href="#purchase-receipt-__details"]', { timeout: LONG_TIMEOUT })
    .first()
    .should(($tab) => {
      const selected = String($tab.attr('aria-selected') || '').toLowerCase() === 'true';
      const active = $tab.hasClass('active');
      const panelVisible = Cypress.$(
        '#purchase-receipt-__details:visible, .tab-pane:visible[data-fieldname="__details"]'
      ).length > 0;
      expect(selected || active || panelVisible, 'purchase receipt details tab active').to.eq(true);
    });

  clickFirstExisting(
    ['#purchase-receipt-address_and_contact_tab-tab', 'a[data-fieldname="address_and_contact_tab"][href="#purchase-receipt-address_and_contact_tab"]'],
    'Purchase receipt address and contact tab'
  );
  cy.get(
    '#purchase-receipt-address_and_contact_tab-tab, a[data-fieldname="address_and_contact_tab"][href="#purchase-receipt-address_and_contact_tab"]',
    { timeout: LONG_TIMEOUT }
  )
    .first()
    .should(($tab) => {
      const selected = String($tab.attr('aria-selected') || '').toLowerCase() === 'true';
      const active = $tab.hasClass('active');
      const panelVisible = Cypress.$(
        '#purchase-receipt-address_and_contact_tab:visible, #purchase-receipt-contact_and_address_tab:visible, .tab-pane:visible[data-fieldname="address_and_contact_tab"], .tab-pane:visible[data-fieldname="contact_and_address_tab"]'
      ).length > 0;
      expect(selected || active || panelVisible, 'purchase receipt address and contact tab active').to.eq(true);
    });

  clickFirstExisting(
    ['#purchase-receipt-__details-tab', 'a[data-fieldname="__details"][href="#purchase-receipt-__details"]'],
    'Purchase receipt details tab (again)'
  );
  cy.get('#purchase-receipt-__details-tab, a[data-fieldname="__details"][href="#purchase-receipt-__details"]', { timeout: LONG_TIMEOUT })
    .first()
    .should(($tab) => {
      const selected = String($tab.attr('aria-selected') || '').toLowerCase() === 'true';
      const active = $tab.hasClass('active');
      const panelVisible = Cypress.$(
        '#purchase-receipt-__details:visible, .tab-pane:visible[data-fieldname="__details"]'
      ).length > 0;
      expect(selected || active || panelVisible, 'purchase receipt details tab active again').to.eq(true);
    });

  saveAndSubmit();
};

export const openPaymentEntryList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Buying', '#module-icon-purchases'], 'Buying module');
  clickFirstExisting(['#sidebar-buying-payment-voucher'], 'Payment Entry sidebar');
  waitForOverlay();
};

export const openPurchaseInvoicesList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Buying', '#module-icon-purchases'], 'Buying module');
  clickFirstExisting(['#sidebar-purchases-invoice', '#sidebar-buying-invoice'], 'Purchase Invoice sidebar');
  waitForOverlay();
};

export const openPurchaseOrdersList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Buying', '#module-icon-purchases'], 'Buying module');
  clickFirstExisting(
    [
      '#sidebar-buying-purchase-order',
      '#sidebar-buying-purchase-orders',
      '#sidebar-purchases-purchase-order',
      '#sidebar-purchases-purchase-orders',
      'a[href*="#List/Purchase Order"]',
    ],
    'Purchase Order sidebar'
  );
  waitForOverlay();
};

export const openSalesInvoicesList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Selling'], 'Selling module');
  clickFirstExisting(['#sidebar-selling-invoice'], 'Sales Invoice sidebar');
  waitForOverlay();
};

export const openJournalEntriesList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Accounts'], 'Accounts module');
  clickFirstExisting(['#sidebar-accounts-journal-voucher', '#sidebar-accounts-journal-entry'], 'Journal Entry sidebar');
  waitForOverlay();
};

export const openSalesOrdersList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Selling'], 'Selling module');
  clickFirstExisting(['#sidebar-selling-sales-orders', '#sidebar-selling-sales-order'], 'Sales Order sidebar');
  waitForOverlay();
};

export const openSalesOrdersListPage = () => {
  openSalesOrdersList();
};

export const clickOnNewSalesOrdersBtn = () => {
  waitForOverlay();
  cy.contains(
    'button:visible, .btn:visible, [role="button"]:visible',
    /add\s*sales\s*order/i,
    { timeout: LONG_TIMEOUT }
  )
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true });
  waitForOverlay();
};

export const fillSalesOrderCore = (itemName) => {
  const customerFieldSelector = '#customer, input[data-fieldname="customer"]';
  cy.get(customerFieldSelector, { timeout: LONG_TIMEOUT })
    .filter(':visible')
    .first()
    .as('salesOrderCustomerField');

  cy.get('@salesOrderCustomerField')
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true })
    .type('{downarrow}', { force: true });

  cy.get('@salesOrderCustomerField').then(($input) => {
    const dataTarget = $input.attr('data-target');
    const dataTargetSelector = dataTarget
      ? `[data-target="${dataTarget}"] + ul li:visible, [data-target="${dataTarget}"] ~ ul li:visible`
      : '';
    const fallbackSelector =
      'ul.awesomplete li:visible, .awesomplete [role="option"]:visible, .awesomplete li:visible, [role="listbox"] li:visible, [role="option"]:visible';
    const optionSelectors = [dataTargetSelector, fallbackSelector].filter(Boolean).join(', ');

    const clickFirstCustomerOption = (attempt = 0) =>
      cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        const opts = $body.find(optionSelectors);
        if (opts.length) {
          return cy.wrap(opts[0], { log: false }).click({ force: true });
        }
        if (attempt >= 20) {
          throw new Error('Sales order customer options appeared briefly but could not click the first option');
        }
        return cy
          .get('@salesOrderCustomerField', { log: false })
          .type('{downarrow}', { force: true })
          .wait(180, { log: false })
          .then(() => clickFirstCustomerOption(attempt + 1));
      });

    return clickFirstCustomerOption();
  });

  cy.get(
    '#transaction_date:visible, input[data-fieldname="transaction_date"]:visible, #delivery_date:visible, input[data-fieldname="delivery_date"]:visible, #due_date:visible, input[data-fieldname="due_date"]:visible',
    { timeout: LONG_TIMEOUT }
  )
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .should(($input) => {
      const value = String($input.val() || '').trim();
      expect(value, 'sales order due date value').to.not.equal('');
    })
    .invoke('val')
    .then((value) => {
      const salesOrderDueDateValue = String(value || '').trim();
      cy.log(`Sales Order Due Date: ${salesOrderDueDateValue}`);
      return cy.wrap(salesOrderDueDateValue, { log: false }).as('salesOrderDueDate');
    });

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
  clickFirstExisting(rowItemCodeStaticCell, 'Sales order item code static cell (row)');
  cy.get(rowItemCodeStaticCell.join(', '), { timeout: LONG_TIMEOUT }).first().dblclick({ force: true });
  cy.get(rowItemCodeInputSelectors.join(', '), { timeout: LONG_TIMEOUT }).then(($inputs) => {
    const inputTarget = $inputs.toArray().find((el) => Cypress.$(el).is(':visible')) || $inputs[0];
    if (!inputTarget) {
      throw new Error(`Could not find sales order item input using selectors: ${rowItemCodeInputSelectors.join(', ')}`);
    }
    cy.wrap(inputTarget, { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true });
  });

  pickFirstDynamicOption(
    rowItemCodeInputSelectors,
    itemName,
    'Sales order item code input'
  );

  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const submitTarget = $body
      .find('.save-submit-action.toolbar-btn:visible, [data-action_name="Submit"]:visible, [data-action-name="Submit"]:visible')
      .toArray()[0];
    if (submitTarget) {
      cy.wrap(submitTarget, { log: false }).scrollIntoView({ offset: { top: -120, left: 0 } });
    }
  });
};

export const saveAndSubmitSalesOrder = () => {
  saveAndSubmit();
};

export const enterValidDataIntoSalesOrderPage = (_dueDate, itemName) => {
  fillSalesOrderCore(itemName);
  saveAndSubmitSalesOrder();
};

export const getSalesOrderStatusBeforeCreatingRelatedSalesInvoice = () =>
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const createBtn = $body.find('.btn.toolbar-btn.btn-primary:visible, .btn.btn-default.toolbar-btn:visible, [data-label*="Create"]:visible');
    if (!createBtn.length) {
      throw new Error('Create button not found on Sales Order page before creating related Sales Invoice');
    }

    const statusEl = $body
      .find('.indicator-pill.no-indicator-dot.whitespace-nowrap:visible, .indicator-pill:visible, .indicator:visible')
      .toArray()
      .find((el) => (Cypress.$(el).text() || '').trim().length > 0);

    if (!statusEl) {
      throw new Error('Sales Order status indicator not found before creating related Sales Invoice');
    }

    const statusText = (Cypress.$(statusEl).text() || '').trim();
    Cypress.log({ name: 'SalesOrderStatusBefore', message: statusText });
    return statusText;
  });

export const createNewSalesInvoiceFromSalesOrder = () => {
  waitForOverlay();

  const createBtnSelector = 'button:visible, .btn:visible, [role="button"]:visible, a:visible';
  const createDropdownSelector = 'button.btn.toolbar-btn.btn-primary:visible, .btn.toolbar-btn.btn-primary:visible';
  const createBtnPattern = /\u0625\u0646\u0634\u0627\u0621|\u0627\u0646\u0634\u0627\u0621|create/i;
  const salesInvoiceChoicePattern = /sales\s*invoice/i;

  const clickCreateMenuButton = () =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const target = $body
        .find(createDropdownSelector)
        .toArray()
        .find((el) => {
          const text = (Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim();
          return createBtnPattern.test(text);
        });

      if (target) {
        return cy.wrap(target, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true });
      }

      return cy.contains(createBtnSelector, createBtnPattern, { timeout: LONG_TIMEOUT })
        .first()
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true });
    });

  clickCreateMenuButton();

  const clickSalesInvoiceChoice = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const target = $body
        .find('.dropdown-menu:visible .dropdown-item:visible, .show .dropdown-item:visible, [role="menu"]:visible [role="menuitem"]:visible, [role="menuitem"]:visible')
        .toArray()
        .find((el) => {
          const $el = Cypress.$(el);
          const text = ($el.text() || '').replace(/\s+/g, ' ').trim();
          const dataLabel = String($el.attr('data-label') || '');
          return (
            salesInvoiceChoicePattern.test(text) ||
            dataLabel.includes('%D9%81%D8%A7%D8%AA%D9%88%D8%B1%D8%A9%20%D8%A7%D9%84%D9%85%D8%A8%D9%8A%D8%B9%D8%A7%D8%AA')
          );
        });

      if (target) {
        return cy.wrap(target, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true });
      }

      if (attempt >= 20) {
        throw new Error('Create menu choice not found for patterns: sales invoice, ?????? ????????');
      }

      return clickCreateMenuButton()
        .then(() => cy.wait(250, { log: false }))
        .then(() => clickSalesInvoiceChoice(attempt + 1));
    });

  return clickSalesInvoiceChoice().then(() => {
    waitForOverlay();
  });
};

export const saveAndSubmitSalesInvoiceFromDeliveryNote = () => {
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const updateStock = $body.find('#update_stock:visible, input[data-fieldname="update_stock"]:visible')[0];
    if (updateStock && Cypress.$(updateStock).is(':checked')) {
      cy.wrap(updateStock, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true });
    }
  });

  submitSalesInvoice();

  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const createBtn = $body.find('.btn.toolbar-btn.btn-primary:visible, .btn.btn-default.toolbar-btn:visible, [data-label*="Create"]:visible');
    if (!createBtn.length) {
      throw new Error('Create button was not visible after submitting Sales Invoice from Sales Order');
    }
  });
};

export const saveAndSubmitSalesInvoiceFromSalesOrder = saveAndSubmitSalesInvoiceFromDeliveryNote;

export const getSalesOrderStatusAfterCreatingRelatedSalesInvoice = () =>
  cy.get('body', { timeout: LONG_TIMEOUT }).then(() => {
    const statusSelectors = [
      '.indicator-pill.no-indicator-dot.whitespace-nowrap:visible',
      '.indicator-pill:visible',
      '.indicator:visible',
      '.label.label-success:visible',
      '.label:visible',
      '[data-fieldname="status"] .control-value:visible',
      '[data-fieldname="status"] .like-disabled-input:visible',
      '.form-dashboard .indicator-pill:visible',
    ].join(', ');

    const readStatus = (attempt = 0) =>
      cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        const statusEl = $body
          .find(statusSelectors)
          .toArray()
          .find((el) => {
            const text = (Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim();
            if (!text) return false;
            if (/^(create|new|edit|save|submit)$/i.test(text)) return false;
            return true;
          });

        if (statusEl) {
          const statusText = (Cypress.$(statusEl).text() || '').replace(/\s+/g, ' ').trim();
          Cypress.log({ name: 'RelatedDocStatusAfter', message: statusText });
          return statusText;
        }

        return cy.window({ log: false }).then((win) => {
          const doc = win?.cur_frm?.doc || null;
          const rawStatus = String(doc?.status || '').replace(/\s+/g, ' ').trim();
          if (rawStatus) {
            Cypress.log({ name: 'RelatedDocStatusAfter(cur_frm)', message: rawStatus });
            return rawStatus;
          }

          const rawDocstatus = Number(doc?.docstatus);
          if (rawDocstatus === 0) return 'Draft';
          if (rawDocstatus === 1) return 'Submitted';
          if (rawDocstatus === 2) return 'Cancelled';

          if (attempt >= 25) {
            throw new Error('Related document status not found after creating related Sales Invoice');
          }

          return cy
            .wait(300, { log: false })
            .then(() => waitForOverlay())
            .then(() => readStatus(attempt + 1));
        });
      });

    return readStatus();
  });

export const openDebitNotesList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Selling'], 'Selling module');
  clickFirstExisting(['#sidebar-selling-debit-note'], 'Debit Note sidebar');
  waitForOverlay();
};

export const openCreditNotesSalesList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Selling'], 'Selling module');
  clickFirstExisting(['#sidebar-selling-return-note', '#sidebar-selling-credit-notes'], 'Credit Notes Sales sidebar');
  waitForOverlay();
};

export const openCreditNotesPurchaseList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Buying', '#module-icon-purchases'], 'Buying module');
  clickFirstExisting(['#sidebar-buying-purchase-return-note', '#sidebar-purchases-debit-notes'], 'Credit Notes Purchase sidebar');
  waitForOverlay();
};

export const openCustomersList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Selling'], 'Selling module');
  clickFirstExisting(['#sidebar-selling-customers', 'a[href*="#List/Customer"]'], 'Customers sidebar');
  waitForOverlay();
};

export const openSuppliersList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Buying', '#module-icon-purchases'], 'Buying module');
  clickFirstExisting(['#sidebar-purchases-suppliers', 'a[href*="#List/Supplier"]'], 'Suppliers sidebar');
  waitForOverlay();
};

export const openCompaniesListV4 = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Accounts'], 'Accounts module');
  clickFirstExisting(['#sidebar-accounts-company'], 'Company section');
  clickFirstExisting(['[data-name="Company Section Companies"]', '#sidebar-accounts-company-section-companies'], 'Companies option');
  waitForOverlay();
};

export const openCompaniesListV5 = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Accounts'], 'Accounts module');
  clickFirstExisting(['#sidebar-accounts-company-section-companies', '#sidebar-accounts-company'], 'Companies option');
  waitForOverlay();
};

const readCompanySettingValue = ({ fieldSelectors, labelRegex, debugName }) => {
  const getTextValue = (el) => {
    const $el = Cypress.$(el);
    const raw = $el.is('input,textarea,select')
      ? String($el.val() || '')
      : String($el.text() || '');
    return raw.replace(/\s+/g, ' ').trim();
  };

  const resolveValue = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const scope = $body.find('.layout-main-section:visible, .form-page:visible, .form-layout:visible').first();
      const root = scope.length ? scope : $body;

      const direct = root
        .find(fieldSelectors.join(', '))
        .toArray()
        .find((el) => /\S/.test(getTextValue(el)));

      if (direct) {
        return cy.wrap(direct, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .then(() => getTextValue(direct));
      }

      const labelTarget = root
        .find('label:visible, .control-label:visible, .field-label:visible')
        .toArray()
        .find((el) => labelRegex.test(String(Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim()));

      if (labelTarget) {
        const wrapper = Cypress.$(labelTarget).closest('.frappe-control, .form-group, .section-body, .control-input')[0]
          || Cypress.$(labelTarget).parent()[0];
        if (wrapper) {
          const valueEl = Cypress.$(wrapper)
            .find('.control-value, .like-disabled-input, input, .value')
            .toArray()
            .find((el) => /\S/.test(getTextValue(el)));
          if (valueEl) {
            return cy.wrap(valueEl, { log: false })
              .scrollIntoView({ offset: { top: -120, left: 0 } })
              .then(() => getTextValue(valueEl));
          }
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
    // eslint-disable-next-line no-console
    console.log(`${debugName} is`, value);
    return value;
  });
};

const openCompanyTabByText = (tabPattern, debugName) => {
  const clickBurgerIfPresent = () =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const burger = $body
        .find(
          '#show-sidebar:visible, .fa-bars:visible, .navbar-toggle:visible, .menu-toggle:visible, .sidebar-toggle:visible, [class*="burger"]:visible, button[aria-label]:visible'
        )
        .toArray()
        .find((el) => {
          const $el = Cypress.$(el);
          const cls = String($el.attr('class') || '').toLowerCase();
          const id = String($el.attr('id') || '').toLowerCase();
          const aria = String($el.attr('aria-label') || '').toLowerCase();
          return $el.is(':visible')
            && !$el.prop('disabled')
            && !$el.hasClass('disabled')
            && (
              id.includes('show-sidebar')
              || cls.includes('bars')
              || cls.includes('burger')
              || cls.includes('menu-toggle')
              || cls.includes('sidebar-toggle')
              || aria.includes('menu')
            );
        });

      if (!burger) return;

      return cy.wrap(burger, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true })
        .then(() => {
          waitForOverlay();
        });
    });

  const openTab = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const tab = $body
        .find('.form-tabs a:visible, .nav-tabs a:visible, [role="tab"]:visible, a[data-toggle="tab"]:visible')
        .toArray()
        .find((el) => tabPattern.test(String(Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim()));

      if (tab) {
        return cy.wrap(tab, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true });
      }

      if (attempt >= 15) {
        return cy.contains('a:visible, button:visible, [role="tab"]:visible', tabPattern, { timeout: LONG_TIMEOUT })
          .first()
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true });
      }

      return clickBurgerIfPresent()
        .then(() => cy.wait(250, { log: false }))
        .then(() => openTab(attempt + 1));
    });

  return openTab().then(() => {
    waitForOverlay();
    Cypress.log({ name: 'CompanyTab', message: `Opened ${debugName}` });
  });
};

const clickToggleBackIfPresent = () =>
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const toggleBackImg = $body.find('img.toggle-back__img:visible, .toggle-back__img:visible').toArray()[0];
    if (!toggleBackImg) return;

    const clickTarget = Cypress.$(toggleBackImg).closest('button, a, div, span')[0] || toggleBackImg;
    return cy.wrap(clickTarget, { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true })
      .then(() => {
        waitForOverlay();
      });
  });

export const openCompaniesListPage = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Accounts'], 'Accounts module');
  waitForOverlay();

  const companiesOptionSelectors = [
    '#sidebar-accounts-company-section-companies',
    '#sidebar-accounts-company',
    '[data-name="Company Section Companies"]',
    'a[href*="#List/Company"]',
  ];

  const openCompaniesOption = () =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const target = $body
        .find(companiesOptionSelectors.map((s) => `${s}:visible`).join(', '))
        .toArray()[0];

      if (target) {
        return cy.wrap(target, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true });
      }

      clickFirstExisting(['#module-anchor-Accounts'], 'Accounts module (retry)');
      clickFirstExisting(companiesOptionSelectors, 'Companies option');
    });

  return openCompaniesOption()
    .then(() => {
      waitForOverlay();
      return clickToggleBackIfPresent();
    });
};

export const openSpecificCompany = (companyName = '') => {
  waitForOverlay();
  const normalizedName = String(companyName || Cypress.env('DAFATER_COMPANY_NAME') || '').trim().toLowerCase();
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const openRow = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const root = $body.find('.layout-main-section:visible, .frappe-list:visible, .result:visible').first();
      const anchors = (root.length ? root : $body)
        .find('a.ellipsis[data-doctype="Company"][data-name]:visible, a[data-doctype="Company"][data-name]:visible')
        .toArray();

      const matched = normalizedName
        ? (
          anchors.find((a) => normalize(Cypress.$(a).attr('data-name')) === normalizedName)
          || anchors.find((a) => normalize(Cypress.$(a).text()) === normalizedName)
          || anchors.find((a) => normalize(Cypress.$(a).attr('title')).includes(normalizedName))
        )
        : anchors[0];

      if (matched) {
        return cy.wrap(matched, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true });
      }

      if (attempt >= 20) {
        throw new Error(`Could not open company: ${normalizedName || '(first visible company)'}`);
      }

      return cy
        .get('.layout-main-section:visible, .form-page:visible, body', { timeout: LONG_TIMEOUT })
        .first()
        .scrollTo('top', { ensureScrollable: false, log: false })
        .wait(250, { log: false })
        .then(() => openRow(attempt + 1));
    });

  return openRow()
    .then(() => {
      waitForOverlay();
    });
};

export const getDefaultCreditAccount = () => {
  waitForOverlay();
  return openCompanyTabByText(/accounts|الحسابات/i, 'Accounts')
    .then(() =>
      readCompanySettingValue({
        fieldSelectors: [
          '[data-fieldname="default_credit_account"] .control-value:visible',
          '[data-fieldname="default_credit_account"] .like-disabled-input:visible',
          'input[data-fieldname="default_credit_account"]:visible',
          '[data-fieldname="default_payable_account"] .control-value:visible',
          '[data-fieldname="default_payable_account"] .like-disabled-input:visible',
          'input[data-fieldname="default_payable_account"]:visible',
        ],
        labelRegex: /default\s*credit\s*account|credit\s*account|default\s*payable\s*account|payable/i,
        debugName: 'Default credit account',
      })
    );
};

export const getDefaultExpenseAccount = () => {
  waitForOverlay();
  return openCompanyTabByText(/accounts|الحسابات/i, 'Accounts')
    .then(() =>
      readCompanySettingValue({
        fieldSelectors: [
          '[data-fieldname="default_expense_account"] .control-value:visible',
          '[data-fieldname="default_expense_account"] .like-disabled-input:visible',
          'input[data-fieldname="default_expense_account"]:visible',
          '[data-fieldname="expense_account"] .control-value:visible',
          '[data-fieldname="expense_account"] .like-disabled-input:visible',
          'input[data-fieldname="expense_account"]:visible',
        ],
        labelRegex: /default\s*expense\s*account|expense\s*account|مصروف/i,
        debugName: 'Default expense account',
      })
    );
};

export const getDefaultStockNotBilledAccount = () => {
  waitForOverlay();
  return openCompanyTabByText(/stock|المخزون/i, 'Stock')
    .then(() =>
      readCompanySettingValue({
        fieldSelectors: [
          '[data-fieldname="stock_received_but_not_billed"] .control-value:visible',
          '[data-fieldname="stock_received_but_not_billed"] .like-disabled-input:visible',
          'input[data-fieldname="stock_received_but_not_billed"]:visible',
          '[data-fieldname="default_stock_not_billed_account"] .control-value:visible',
          '[data-fieldname="default_stock_not_billed_account"] .like-disabled-input:visible',
          'input[data-fieldname="default_stock_not_billed_account"]:visible',
        ],
        labelRegex: /stock\s*received\s*but\s*not\s*billed|stock\s*not\s*billed|not\s*billed|غير\s*مفو/i,
        debugName: 'Default stock not billed account',
      })
    );
};

export const openBanksListV4 = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Accounts'], 'Accounts module');
  clickFirstExisting(['#sidebar-accounts-initiate-accounts'], 'Accounts setup');
  clickFirstExisting(['#sidebar-accounts-Banks'], 'Banks option v4');
  waitForOverlay();
};

export const openBanksListV5 = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Accounts'], 'Accounts module');
  clickFirstExisting(['#sidebar-accounts-bank'], 'Bank section v5');
  clickFirstExisting(['#sidebar-accounts-banks'], 'Banks option v5');
  waitForOverlay();
};

export const openChartOfAccountsList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Accounts'], 'Accounts module');
  clickFirstExisting(['#sidebar-accounts-chart-of-accounts'], 'Chart of Accounts option');
  waitForOverlay();
};

export const openSalesTaxesTemplatesList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Selling'], 'Selling module');
  clickFirstExisting(['#sidebar-selling-', '#sidebar-selling-initiate-sales'], 'Selling setup');
  clickFirstExisting(['#sidebar-selling-sales-tax-charges'], 'Sales tax template option');
  waitForOverlay();
};

export const openPurchaseTaxesTemplatesList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Buying', '#module-icon-purchases'], 'Buying module');
  clickFirstExisting(['#sidebar-buying-initiate-purchases'], 'Buying setup');
  clickFirstExisting(['#sidebar-buying-purchase-tax-charges', '#sidebar-buying-purchase-taxes-and-charges-master'], 'Purchase tax template option');
  waitForOverlay();
};

export const openFiscalYearsList = () => {
  ensureSidebarVisible();
  clickFirstExisting(['.header__settings-btn', '[class*="header__settings-btn"]'], 'Settings button');
  clickFirstExisting(['#toolbar-setup', 'a[href*="/app/list-settings"]'], 'Setup option');
  clickFirstExisting(['#setup-page-fiscal-year', 'a[href*="fiscal-year"]'], 'Fiscal Year option');
  waitForOverlay();
};

export const openReportsModule = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-reports', '#module-icon-reports a'], 'Reports module');
  waitForOverlay();
};

export const openReportBySelectors = (selectors, label) => {
  openReportsModule();
  clickFirstExisting(selectors, label);
  waitForOverlay();
};

export const readTotalRowsCount = () =>
  cy
    .xpath('//*[contains(@class,"list-count")]| //*[contains(@class,"total-rows")]  ', { timeout: LONG_TIMEOUT })
    .first()
    .should(($el) => {
      const text = $el.text().trim();
      expect(text).to.not.contain('?????');
    })
    .invoke('text')
    .then((text) => {
      const count = parseLastNumber(text);
      Cypress.log({ name: 'readTotalRowsCount', message: String(count) });
      return count;
    });

export const readItemIndicatorCount = (index) =>
  cy
    .get('.Item-listview-card .list-indicators__item-indicator span', { timeout: LONG_TIMEOUT })
    .eq(index)
    .invoke('text')
    .then((text) => parseLastNumber(text));

export const startNewItem = () => {
  openItemsList();
  clickNewPrimaryAction();
  waitForOverlay();
  clickFullScreenRequired();
  cy.get('input[data-fieldname="item_code"], #item_code', { timeout: LONG_TIMEOUT }).should('be.visible');
};

export const createItem = (itemCode) => {
  startNewItem();
  typeFirstExisting(['#item_code', 'input[data-fieldname="item_code"]'], itemCode, 'Item code field');
  clickFirstExisting(
    ['[data-action_name="Save"]', '[data-action-name="Save"]', '#appframe-btn-save', '.modal-dialog:visible .btn.btn-primary.btn-sm'],
    'Save item button'
  );
  waitForOverlay();
  cy.get('body').then(($body) => {
    const status = $body.find('.indicator-pill, .label-success');
    if (status.length) {
      cy.wrap(status[0]).should('exist');
    }
  });
};

export const openSellingPriceLists = () => {
  ensureSidebarVisible();
  clickFirstExisting(['#module-anchor-Selling'], 'Selling module');
  clickFirstExisting(['#sidebar-selling-price-lists', '[href*="#List/Price List"]'], 'Price Lists');
  waitForOverlay();
};

export const openStandardSellingList = () => {
  clickFirstExisting(['[title*="Standard Selling"]'], 'Standard Selling');
  waitForOverlay();
};

export const openStandardBuyingList = () => {
  clickFirstExisting(['[title*="Standard Buying"]'], 'Standard Buying');
  waitForOverlay();
};

export const openItemsPricesTable = () => {
  clickFirstExisting(['.btn.btn-default.toolbar-btn'], 'Items Prices Table');
  waitForOverlay();
};

export const openItemPricePage = () => {
  const normalize = (v) =>
    String(v || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  cy.contains(
    'button:visible, a:visible, .btn:visible, [role="button"]:visible, .dropdown-item:visible, [role="menuitem"]:visible',
    /\u0625?\u0636\u0627\u0641(?:\u0629|\u0647)\s*\u0648\s*\u062a\u0639\u062f\u064a\u0644\s*\u0627(?:\u0644)?(?:\u0623|\u0627)?\u0633\u0639\u0627\u0631|add\s*edit\s*price|add\s*and\s*edit\s*price/i,
    { timeout: LONG_TIMEOUT }
  )
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true });
  waitForOverlay();

  const clickAddItemPriceButton = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const candidates = $body
        .find('button:visible, a:visible, .btn:visible, [role="button"]:visible')
        .toArray();

      const target = candidates.find((el) => {
        const $el = Cypress.$(el);
        const text = normalize($el.text());
        const dataLabelRaw = String($el.attr('data-label') || '');
        let dataLabel = dataLabelRaw;
        try {
          dataLabel = decodeURIComponent(dataLabelRaw);
        } catch (e) {
          dataLabel = dataLabelRaw;
        }
        dataLabel = normalize(dataLabel);
        const cls = normalize($el.attr('class'));

        const isAddItemPriceText =
          /\u0625?\u0636\u0627\u0641(?:\u0629|\u0647)\s*\u0633\u0639\u0631\s*\u0627(?:\u0644)?\u0635\u0646\u0641|add\s*item\s*price/i.test(text)
          || /\u0625?\u0636\u0627\u0641(?:\u0629|\u0647)\s*\u0633\u0639\u0631\s*\u0627(?:\u0644)?\u0635\u0646\u0641|add\s*item\s*price/i.test(dataLabel);

        return isAddItemPriceText && (cls.includes('primary-action') || cls.includes('toolbar-btn'));
      });

      if (!target) {
        if (attempt >= 12) {
          throw new Error('Could not find visible "Add Item Price / Ø¥Ø¶Ø§ÙØ© Ø³Ø¹Ø± Ø§Ù„ØµÙ†Ù" button');
        }
        return cy.wait(250, { log: false }).then(() => clickAddItemPriceButton(attempt + 1));
      }

      return cy.wrap(target, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true });
    });

  clickAddItemPriceButton();
  waitForOverlay();

  // Full-screen action is optional here; continue when not present.
  clickFullScreenIfPresent();
  cy.get(
    'input[data-fieldname="item_code"]:visible, #item_code:visible, input[data-fieldname="price_list"][data-doctype="Item Price"]:visible',
    { timeout: LONG_TIMEOUT }
  ).should('exist');
};

export const selectStandardSellingPriceList = () => {
  const optionPattern = /\u0627\u0644\u0628\u064a\u0639\s*\u0627\u0644\u0642\u064a\u0627\u0633\u064a(?:\u0629|\u0647)|standard\s*selling/i;

  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const pages = $body
      .find('.content.page-container:visible, .page-container:visible, .form-page:visible')
      .toArray();
    const activePage = pages[pages.length - 1] || $body[0];

    const candidates = Cypress.$(activePage)
      .find('input[data-fieldname="price_list"][data-doctype="Item Price"]:visible, input[data-fieldname="price_list"]:visible, #price_list:visible')
      .toArray();

    const target = candidates[candidates.length - 1];
    if (!target) throw new Error('Price List field not found on Item Price page');

    cy.wrap(target, { log: false })
      .as('itemPriceListInput')
      .scrollIntoView()
      .click({ force: true })
      .clear({ force: true })
      .type('\u0627\u0644\u0628\u064a\u0639 \u0627\u0644\u0642\u064a\u0627\u0633\u064a\u0629', { force: true });
  });

  cy.get('@itemPriceListInput').then(() => {
    cy.contains(
      'ul.awesomplete li:visible, [role="listbox"] li:visible, .awesomplete li:visible, [role="option"]:visible',
      optionPattern,
      { timeout: LONG_TIMEOUT }
    )
      .first()
      .click({ force: true });
  });

  cy.get('@itemPriceListInput')
    .invoke('val')
    .then((value) => {
      expect(String(value || '').replace(/\s+/g, ' ').trim()).to.match(optionPattern);
    });
};

export const selectStandardBuyingPriceList = () => {
  const optionPattern = /(?:\u0627\u0644)?\u0634\u0631\u0627\u0621\s*\u0627\u0644\u0642\u064a\u0627\u0633\u064a(?:\u0629|\u0647)|standard\s*buying/i;
  const normalize = (v) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();

  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const pages = $body
      .find('.content.page-container:visible, .page-container:visible, .form-page:visible')
      .toArray();
    const activePage = pages[pages.length - 1] || $body[0];

    const candidates = Cypress.$(activePage)
      .find('input[data-fieldname="price_list"][data-doctype="Item Price"]:visible, input[data-fieldname="price_list"]:visible, #price_list:visible')
      .toArray();

    const target = candidates[candidates.length - 1];
    if (!target) throw new Error('Price List field not found on Item Price page');

    cy.wrap(target, { log: false })
      .as('itemPriceListInput')
      .scrollIntoView()
      .click({ force: true })
      .clear({ force: true })
      .type('\u0634\u0631\u0627\u0621 \u0627\u0644\u0642\u064a\u0627\u0633\u064a\u0629', { force: true });
  });

  cy.get('@itemPriceListInput').then(() => {
    const optionSelectors = [
      'ul.awesomplete li:visible',
      '[role="listbox"] li:visible',
      '.awesomplete li:visible',
      '[role="option"]:visible',
      'ul.awesomplete p:visible',
      'ul.awesomplete p strong:visible',
      '[role="listbox"] p:visible',
      '.awesomplete [title]:visible',
    ].join(', ');

    const clickBuyingOption = (attempt = 0) =>
      cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        const target = $body.find(optionSelectors).toArray().find((el) => {
          const $el = Cypress.$(el);
          const text = normalize($el.text());
          const title = normalize($el.attr('title'));
          const dataValue = normalize($el.attr('data-value') || $el.attr('value'));
          return optionPattern.test(text) || optionPattern.test(title) || optionPattern.test(dataValue);
        });

        if (target) {
          const clickTarget = Cypress.$(target).is('strong')
            ? (Cypress.$(target).closest('p,li,[role="option"]')[0] || target)
            : target;
          return cy.wrap(clickTarget, { log: false })
            .scrollIntoView({ offset: { top: -120, left: 0 } })
            .click({ force: true });
        }

        if (attempt >= 20) {
          throw new Error('Standard Buying option not found in price-list dropdown');
        }

        return cy
          .get('@itemPriceListInput', { log: false })
          .type('{downarrow}', { force: true })
          .wait(180, { log: false })
          .then(() => clickBuyingOption(attempt + 1));
      });

    return clickBuyingOption();
  });

  cy.get('@itemPriceListInput')
    .invoke('val')
    .then((value) => {
      expect(String(value || '').replace(/\s+/g, ' ').trim()).to.match(optionPattern);
    });
};

export const addingPriceForItem = (itemCode, price, priceListKind = 'selling') => {
  typeFirstExisting(['input[data-fieldname="item_code"]', '#item_code'], itemCode, 'Item price code field');
  if (String(priceListKind).toLowerCase() === 'buying') {
    selectStandardBuyingPriceList();
  } else {
    selectStandardSellingPriceList();
  }
  typeFirstExisting(['input[data-fieldname="price_list_rate"]'], price, 'Price field');
  cy.get('input[data-fieldname="price_list_rate"]:visible, #price_list_rate:visible', { timeout: LONG_TIMEOUT }).last().then(($rate) => {
    const SAVE_CANDIDATES = 'button, a, .btn, [id^="appframe-btn-"], [data-action_name], [data-action-name]';
    const isSaveButton = (el) => {
      const $el = Cypress.$(el);
      const text = ($el.text() || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const id = ($el.attr('id') || '').toLowerCase();
      const action = ($el.attr('data-action_name') || $el.attr('data-action-name') || '').toLowerCase();
      const disabled = $el.prop('disabled') || $el.hasClass('disabled');
      return !disabled && (text.includes('???') || text.includes('save') || id.includes('appframe-btn-???') || id.includes('appframe-btn-save') || action === 'save');
    };
    const pickInScope = ($scope, visibleOnly) =>
      $scope
        .find(SAVE_CANDIDATES)
        .toArray()
        .filter((el) => (visibleOnly ? Cypress.$(el).is(':visible') : true))
        .find((el) => {
          const $el = Cypress.$(el);
          const text = ($el.text() || '').replace(/\s+/g, ' ').trim().toLowerCase();
          const id = ($el.attr('id') || '').toLowerCase();
          const action = ($el.attr('data-action_name') || $el.attr('data-action-name') || '').toLowerCase();
          const disabled = $el.prop('disabled') || $el.hasClass('disabled');
          return !disabled && (
            text === '???' ||
            text === 'save' ||
            id === 'appframe-btn-???' ||
            id === 'appframe-btn-save' ||
            action === 'save'
          );
        }) ||
      $scope
        .find(SAVE_CANDIDATES)
        .toArray()
        .filter((el) => (visibleOnly ? Cypress.$(el).is(':visible') : true))
        .find(isSaveButton);

    const ancestors = [$rate[0], ...$rate.parents().toArray()].map((el) => Cypress.$(el));
    const scopedAncestor = ancestors.find(($el) => pickInScope($el, true) || pickInScope($el, false));
    const $scope = scopedAncestor || Cypress.$('body');
    const target = pickInScope($scope, true) || pickInScope($scope, false);

    if (!target) {
      const seen = Cypress.$('body')
        .find(SAVE_CANDIDATES)
        .toArray()
        .filter((el) => Cypress.$(el).is(':visible'))
        .map((el) => (Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' | ');
      throw new Error(`Save button not found near Item Price fields. Visible controls: ${seen || 'none'}`);
    }
    cy.wrap(target, { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true });
  });
  waitForOverlay();
};

export const addItemPriceStandardSelling = (itemCode, itemPrice) => {
  openSellingPriceLists();
  openStandardSellingList();
  openItemsPricesTable();
  openItemPricePage();
  addingPriceForItem(itemCode, itemPrice);
};

export const addItemPriceStandardBuying = (itemCode, itemPrice) => {
  openSellingPriceLists();
  openStandardBuyingList();
  openItemsPricesTable();
  openItemPricePage();
  addingPriceForItem(itemCode, itemPrice, 'buying');
};

export const startNewSalesInvoice = () => {
  openSalesInvoicesList();
  clickNewPrimaryAction();
  waitForOverlay();
};

export const selectSalesInvoiceCustomer = () => {
  const customerFieldSelector = '#customer, input[data-fieldname="customer"]';
  cy.get(customerFieldSelector, { timeout: LONG_TIMEOUT })
    .filter(':visible')
    .first()
    .as('salesInvoiceCustomerField');

  cy.get('@salesInvoiceCustomerField')
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true })
    .type('{downarrow}', { force: true });

  cy.get('@salesInvoiceCustomerField').should(($input) => {
    const expanded = String($input.attr('aria-expanded') || '').toLowerCase() === 'true';
    const focused = Cypress.dom.isFocused($input[0]);
    expect(expanded || focused, 'sales invoice customer field activated').to.eq(true);
  });

  cy.get('@salesInvoiceCustomerField').then(($input) => {
    const dataTarget = $input.attr('data-target');
    const dataTargetSelector = dataTarget
      ? `[data-target="${dataTarget}"] + ul li:visible, [data-target="${dataTarget}"] ~ ul li:visible`
      : '';
    const fallbackSelector =
      'ul.awesomplete li:visible, .awesomplete [role="option"]:visible, .awesomplete li:visible, [role="listbox"] li:visible, [role="option"]:visible';
    const optionSelectors = [dataTargetSelector, fallbackSelector].filter(Boolean).join(', ');

    const clickFirstCustomerOption = (attempt = 0) =>
      cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        const opts = $body.find(optionSelectors);
        if (opts.length) {
          return cy.wrap(opts[0], { log: false }).click({ force: true });
        }

        if (attempt >= 20) {
          throw new Error('Sales invoice customer options appeared briefly but could not click the first option');
        }

        return cy
          .get('@salesInvoiceCustomerField', { log: false })
          .type('{downarrow}', { force: true })
          .wait(180, { log: false })
          .then(() => clickFirstCustomerOption(attempt + 1));
      });

    return clickFirstCustomerOption();
  });
};

export const getSalesInvoiceDueDate = () =>
  cy.get('#due_date, input[data-fieldname="due_date"]', { timeout: LONG_TIMEOUT })
    .filter(':visible')
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .should(($input) => {
      const value = String($input.val() || '').trim();
      expect(value, 'sales invoice due date value').to.not.equal('');
    })
    .invoke('val')
    .then((value) => {
      const dueDateValue = String(value || '').trim();
      cy.log(`Sales Invoice Due Date: ${dueDateValue}`);
      return cy.wrap(dueDateValue, { log: false }).as('salesInvoiceDueDate').then(() => dueDateValue);
    });

export const selectSalesInvoiceItem = (itemCode) => {
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
  clickFirstExisting(rowItemCodeStaticCell, 'Sales invoice item code static cell (row)');
  cy.get(rowItemCodeStaticCell.join(', '), { timeout: LONG_TIMEOUT }).first().dblclick({ force: true });
  cy.get(rowItemCodeInputSelectors.join(', '), { timeout: LONG_TIMEOUT })
    .then(($inputs) => {
      const inputTarget = $inputs.toArray().find((el) => Cypress.$(el).is(':visible')) || $inputs[0];
      if (!inputTarget) {
        throw new Error(`Could not find sales invoice item input using selectors: ${rowItemCodeInputSelectors.join(', ')}`);
      }
      cy.wrap(inputTarget, { log: false })
        .as('salesInvoiceItemField')
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

          if (matchingOpt) {
            return cy.wrap(matchingOpt, { log: false }).click({ force: true });
          }

          if (attempt >= 25) {
            throw new Error(`Sales invoice item options appeared but no option matched item code: ${String(itemCode)}`);
          }

          return cy
            .get('@salesInvoiceItemField', { log: false })
            .type('{downarrow}', { force: true })
            .wait(180, { log: false })
            .then(() => clickMatchingItemOption(attempt + 1));
        });

      return clickMatchingItemOption();
    });

  cy.get('#sales-invoice-__details-tab, a[data-fieldname="__details"][href="#sales-invoice-__details"]', { timeout: LONG_TIMEOUT })
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true })
    .should(($tab) => {
      const selected = String($tab.attr('aria-selected') || '').toLowerCase() === 'true';
      const active = $tab.hasClass('active');
      const panelVisible = Cypress.$('#sales-invoice-__details:visible, .tab-pane:visible[data-fieldname="__details"]').length > 0;
      expect(selected || active || panelVisible, 'sales invoice details tab active').to.eq(true);
    });

  cy.get(
    '#sales-invoice-contact_and_address_tab-tab, a[data-fieldname="contact_and_address_tab"][href="#sales-invoice-contact_and_address_tab"], #sales-invoice-address_and_contact_tab-tab, a[data-fieldname="address_and_contact_tab"][href="#sales-invoice-address_and_contact_tab"]',
    { timeout: LONG_TIMEOUT }
  )
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true })
    .should(($tab) => {
      const selected = String($tab.attr('aria-selected') || '').toLowerCase() === 'true';
      const active = $tab.hasClass('active');
      const panelVisible = Cypress.$(
        '#sales-invoice-contact_and_address_tab:visible, #sales-invoice-address_and_contact_tab:visible, .tab-pane:visible[data-fieldname="contact_and_address_tab"], .tab-pane:visible[data-fieldname="address_and_contact_tab"]'
      ).length > 0;
      expect(selected || active || panelVisible, 'sales invoice address and contact tab active').to.eq(true);
    });

  cy.get('#sales-invoice-__details-tab, a[data-fieldname="__details"][href="#sales-invoice-__details"]', { timeout: LONG_TIMEOUT })
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true })
    .should(($tab) => {
      const selected = String($tab.attr('aria-selected') || '').toLowerCase() === 'true';
      const active = $tab.hasClass('active');
      const panelVisible = Cypress.$('#sales-invoice-__details:visible, .tab-pane:visible[data-fieldname="__details"]').length > 0;
      expect(selected || active || panelVisible, 'sales invoice details tab active again').to.eq(true);
    });

  cy.wait(60000, { log: false });
};

export const fillSalesInvoiceCore = ({ itemCode }) => {
  selectSalesInvoiceCustomer();
  getSalesInvoiceDueDate();
  selectSalesInvoiceItem(itemCode);

  cy.get('body').then(($body) => {
    const updateStock = $body.find('#update_stock, input[data-fieldname="update_stock"]');
    if (updateStock.length && Cypress.$(updateStock[0]).is(':checked')) {
      cy.wrap(updateStock[0]).click({ force: true });
    }
  });
};

export const saveSalesInvoice = () => {
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const normalize = (v) =>
      String(v || '')
        .replace(/[???]/g, '?')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    const target = $body
      .find('button:visible, .btn:visible, [role="button"]:visible, [id^="appframe-btn-"]:visible')
      .toArray()
      .find((el) => {
        const $el = Cypress.$(el);
        const text = normalize($el.text());
        const id = normalize($el.attr('id'));
        const action = normalize($el.attr('data-action_name') || $el.attr('data-action-name'));
        const isSave = text.includes('???') || text.includes('save') || id.includes('appframe-btn-???') || id.includes('appframe-btn-save') || action === 'save';
        const isSubmit = text.includes('??????') || text.includes('submit') || text.includes('save and submit');
        return isSave && !isSubmit;
      });

    if (!target) {
      throw new Error('Could not find visible "??? / Save" button by text');
    }

    cy.wrap(target, { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true });
  });
  waitForOverlay();
};

export const submitSalesInvoice = () => {
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const normalize = (v) =>
      String(v || '')
        .replace(/[???]/g, '?')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

    const target = $body
      .find('button:visible, .btn:visible, [role="button"]:visible, [id^="appframe-btn-"]:visible')
      .toArray()
      .find((el) => {
        const $el = Cypress.$(el);
        const text = normalize($el.text());
        const id = normalize($el.attr('id'));
        const action = normalize($el.attr('data-action_name') || $el.attr('data-action-name'));
        const cls = normalize($el.attr('class'));
        const isSubmit = text.includes('??? ???????') || text.includes('??????') || text.includes('submit') || action === 'submit' || cls.includes('save-submit-action');
        const isSaveOnly = (text === '???' || text === 'save') || action === 'save';
        return isSubmit && !isSaveOnly;
      });

    if (!target) {
      throw new Error('Could not find visible "??? ??????? / Submit" button by text');
    }

    cy.wrap(target, { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true });
  });

  cy.contains(
    '.btn.btn-primary.btn-sm.btn-modal-primary:visible, .btn.btn-yes:visible, .modal-dialog:visible button:visible, .page-form:visible button:visible, .page-form:visible .btn:visible',
    /\u0646\u0639\u0645|yes/i,
    { timeout: LONG_TIMEOUT }
  )
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true });
  waitForOverlay();
};

export const getSalesInvoiceNameFromUrl = () =>
  cy.url({ timeout: LONG_TIMEOUT }).then((url) => {
    let decodedUrl = String(url || '');
    try {
      decodedUrl = decodeURIComponent(decodedUrl);
    } catch (e) {
      decodedUrl = String(url || '');
    }

    const match = decodedUrl.match(/\/sales-invoice\/([^/?#]+)/i);
    if (!match || !match[1]) {
      throw new Error(`Could not extract Sales Invoice name from URL: ${decodedUrl}`);
    }

    const salesInvoiceName = String(match[1]).trim();
    cy.log(`Sales Invoice Name: ${salesInvoiceName}`);
    return cy.wrap(salesInvoiceName, { log: false }).as('salesInvoiceName').then(() => salesInvoiceName);
  });

export const getInvoiceNameInsideCreditNote = () => {
  const selectors = [
    '#return_against:visible',
    'input[data-fieldname="return_against"]:visible',
    '[data-fieldname="return_against"] input:visible',
    '[data-fieldname="return_against"] .like-disabled-input:visible',
    '#against_sales_invoice:visible',
    'input[data-fieldname="against_sales_invoice"]:visible',
    '[data-fieldname="against_sales_invoice"] input:visible',
    '[data-fieldname="against_sales_invoice"] .like-disabled-input:visible',
  ];

  const readInvoiceName = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const target = $body.find(selectors.join(', ')).toArray().find((el) => {
        const $el = Cypress.$(el);
        const raw = $el.is('input,textarea,select') ? String($el.val() || '') : String($el.text() || '');
        return raw.trim().length > 0;
      });

      if (!target) {
        if (attempt >= 20) {
          throw new Error('Could not find non-empty "Return Against / Against Sales Invoice" value inside Credit Note');
        }
        return cy.wait(250, { log: false }).then(() => readInvoiceName(attempt + 1));
      }

      const $target = Cypress.$(target);
      const rawValue = $target.is('input,textarea,select')
        ? String($target.val() || '')
        : String($target.text() || '');
      return rawValue.replace(/\s+/g, ' ').trim();
    });

  return readInvoiceName(0).then((invoiceNameInsideCreditNote) => {
    Cypress.log({ name: 'InvoiceNameInsideCreditNote', message: invoiceNameInsideCreditNote });

    const aliases = Cypress.state('aliases') || {};
    const aliasSubject = aliases.salesInvoiceName && aliases.salesInvoiceName.subject;
    const expectedSalesInvoiceName = String(aliasSubject || '').trim();

    if (expectedSalesInvoiceName) {
      expect(invoiceNameInsideCreditNote, 'Credit Note references Sales Invoice').to.contain(expectedSalesInvoiceName);
    }

    return invoiceNameInsideCreditNote;
  });
};

export const saveAndSubmitCreditNoteFromSalesInvoice = () => {
  waitForOverlay();

  const reasonSelectors = 'select#reason[data-fieldname="reason"], select[data-fieldname="reason"], [data-fieldname="reason"] select';
  const findReasonField = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const visibleScope = $body.find('.form-page:visible, .layout-main-section:visible, .form-layout:visible').first();
      const searchRoot = visibleScope.length ? visibleScope : $body;
      const candidates = searchRoot
        .find(reasonSelectors)
        .toArray()
        .filter((el) => Cypress.$(el).find('option').length > 1);

      if (candidates.length) {
        const visibleTarget = candidates.find((el) => {
          const $el = Cypress.$(el);
          return $el.is(':visible') && !$el.prop('disabled');
        });

        if (visibleTarget) {
          const scrollContainer = Cypress.$(visibleTarget).closest('.layout-main-section, .form-page, .section-body, .form-layout')[0];
          if (scrollContainer) {
            cy.wrap(scrollContainer, { log: false }).scrollTo('bottom', { ensureScrollable: false, log: false });
          }
          return cy.wrap(visibleTarget, { log: false })
            .scrollIntoView({ offset: { top: -120, left: 0 } })
            .then(() => visibleTarget);
        }

        const fallbackTarget = candidates[0];
        const fallbackContainer = Cypress.$(fallbackTarget).closest('.layout-main-section, .form-page, .section-body, .form-layout')[0];
        if (fallbackContainer) {
          cy.wrap(fallbackContainer, { log: false }).scrollTo('bottom', { ensureScrollable: false, log: false });
        }
        return cy.wrap(fallbackTarget, { log: false }).then(() => fallbackTarget);
      }

      if (attempt >= 25) {
        throw new Error('Reason field not found in Credit Note after scrolling');
      }

      return cy.get('.layout-main-section:visible, .form-page:visible, .form-layout:visible, body', { log: false })
        .first()
        .scrollTo('bottom', { ensureScrollable: false, log: false })
        .wait(250, { log: false })
        .then(() => findReasonField(attempt + 1));
    });

  return findReasonField()
    .then((reasonField) => {
      const values = Cypress.$(reasonField)
        .find('option')
        .toArray()
        .map((opt) => String(Cypress.$(opt).attr('value') || '').trim())
        .filter(Boolean);

      const preferredReasonValue = values.find((v) => /goods or services refund/i.test(v))
        || values.find((v) => /cancellation|suspension|essential change|amendment|change in seller/i.test(v))
        || values[0];

      if (!preferredReasonValue) {
        throw new Error('Reason select has no non-empty options to choose');
      }

      return cy.wrap(reasonField, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .select(preferredReasonValue, { force: true })
        .invoke('val')
        .should('eq', preferredReasonValue);
    })
    .then(() => cy
      .get('.layout-main-section:visible, .form-page:visible, .form-layout:visible, body', { timeout: LONG_TIMEOUT })
      .first()
      .scrollTo('top', { ensureScrollable: false, log: false }))
    .then(() => {
      waitForOverlay();
      return cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        const submitTarget = $body
          .find('.save-submit-action.toolbar-btn:visible, [data-action_name="Submit"]:visible, [data-action-name="Submit"]:visible')
          .toArray()[0];

        if (!submitTarget) {
          throw new Error('Submit credit note button was not found on current Credit Note page');
        }

        return submitTarget;
      });
    })
    .then((submitTarget) => cy.wrap(submitTarget, { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .should('be.visible')
      .as('creditNoteSubmitBtn'))
    .then(() => cy.get('@creditNoteSubmitBtn', { log: false })
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true }))
    .then(() => cy.contains(
      '.btn.btn-primary.btn-sm.btn-modal-primary:visible, .btn.btn-yes:visible, .modal-dialog:visible button:visible, .page-form:visible button:visible, .page-form:visible .btn:visible',
      /\u0646\u0639\u0645|yes/i,
      { timeout: LONG_TIMEOUT }
    )
      .first()
      .scrollIntoView({ offset: { top: -120, left: 0 } })
      .click({ force: true }))
    .then(() => cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const closeTarget = $body
        .find('.modal-dialog:visible .close:visible, .modal-dialog:visible [data-dismiss="modal"]:visible, .msgprint:visible .close:visible')
        .toArray()[0];
      if (!closeTarget) return;

      return cy.wrap(closeTarget, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true });
    }))
    .then(() => {
      waitForOverlay();
    });
};

export const startNewPurchaseInvoice = () => {
  openPurchaseInvoicesList();
  clickNewPrimaryAction();
  waitForOverlay();
};

export const startNewPurchaseOrder = () => {
  openPurchaseOrdersList();
  cy.contains(
    'button:visible, .btn:visible, [role="button"]:visible, a:visible',
    /\u0625?\u0636\u0627\u0641(?:\u0629|\u0647)\s*\u0623?\u0645\u0631\s*\u0627\u0644\u0634\u0631\u0627\u0621|add\s*purchase\s*order/i,
    { timeout: LONG_TIMEOUT }
  )
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true });
  waitForOverlay();
};

export const fillPurchaseOrderCore = (itemCode) => {
  selectPurchaseReceiptSupplier();
  selectPurchaseReceiptItem(itemCode);
};

export const saveAndSubmitPurchaseOrder = () => {
  saveAndSubmit();
};

export const getPurchaseOrderStatusBeforeCreatingRelatedPurchaseInvoice = () =>
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const createBtn = $body.find('.btn.toolbar-btn.btn-primary:visible, .btn.btn-default.toolbar-btn:visible, [data-label*="Create"]:visible');
    if (!createBtn.length) {
      throw new Error('Create button not found on Purchase Order page before creating related Purchase Invoice');
    }
  }).then(() =>
    cy.get(
      'span.indicator-pill.no-indicator-dot.whitespace-nowrap.orange:visible > span:visible, span.indicator-pill.no-indicator-dot.whitespace-nowrap.orange:visible',
      { timeout: LONG_TIMEOUT }
    )
      .first()
      .should('be.visible')
      .invoke('text')
      .then((text) => {
        const statusText = String(text || '').replace(/\s+/g, ' ').trim();
        Cypress.log({ name: 'PurchaseOrderStatusBefore', message: statusText });
        return statusText;
      })
  );

export const createNewPurchaseInvoiceFromPurchaseOrder = () => {
  openCreateMenuAndChoose(['\u0641\u0627\u062a\u0648\u0631\u0629 \u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a', 'purchase invoice', 'invoice']);
};

export const saveAndSubmitPurchaseInvoiceFromPurchaseOrder = () => {
  submitPurchaseInvoice();
};

export const getPurchaseOrderStatusAfterCreatingRelatedPurchaseInvoice = () =>
  getSalesOrderStatusAfterCreatingRelatedSalesInvoice();

export const selectPurchaseInvoiceSupplier = () => {
  waitForOverlay();
  return selectPurchaseReceiptSupplier();
};

export const selectPurchaseInvoiceItem = (itemCode) => {
  // Reuse the stable item-selection flow that is already working in Purchase Receipt.
  selectPurchaseReceiptItem(itemCode);
  cy.get('body').then(($body) => {
    const updateStock = $body.find('#update_stock, input[data-fieldname="update_stock"]');
    if (updateStock.length && Cypress.$(updateStock[0]).is(':checked')) {
      cy.wrap(updateStock[0]).click({ force: true });
    }
  });
};

export const fillPurchaseInvoiceCore = ({ itemCode }) => {
  selectPurchaseInvoiceSupplier();
  selectPurchaseInvoiceItem(itemCode);
};

const readPurchaseInvoiceAmount = ({ fieldSelectors, labelRegex, debugName }) => {
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

      if (directTarget) {
        return cy.wrap(directTarget, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .then(() => readValue(directTarget));
      }

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
          if (valueTarget) {
            return cy.wrap(valueTarget, { log: false })
              .scrollIntoView({ offset: { top: -120, left: 0 } })
              .then(() => readValue(valueTarget));
          }
        }
      }

      if (attempt >= 20) {
        throw new Error(`${debugName} not found on Purchase Invoice page`);
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

export const getGrandTotalAmountOfPurchaseInvoice = () => {
  waitForOverlay();
  const grandTotalXpath = "//div[@data-fieldname='grand_total']/div/div/div/div[2]/div/span";

  return cy
    .xpath(grandTotalXpath, { timeout: LONG_TIMEOUT })
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .should('be.visible')
    .invoke('text')
    .then((text) => {
      const amountText = String(text || '').replace(/\s+/g, ' ').trim();
      Cypress.log({ name: 'GrandTotalPurchaseInvoice', message: amountText });
      // eslint-disable-next-line no-console
      console.log('Grand total amount of purchase invoice is', amountText);
      return amountText;
    });
};

export const getTotalAmountOfPurchaseInvoice = () => {
  waitForOverlay();
  const fieldSelectors = [
    '[data-fieldname="total"] .control-value:visible',
    '[data-fieldname="total"] .like-disabled-input:visible',
    '[data-fieldname="total"] input:visible',
    'input[data-fieldname="total"]:visible',
    '[data-fieldname="net_total"] .control-value:visible',
    '[data-fieldname="net_total"] .like-disabled-input:visible',
    '[data-fieldname="base_total"] .control-value:visible',
    '[data-fieldname="base_total"] .like-disabled-input:visible',
  ];

  return readPurchaseInvoiceAmount({
    fieldSelectors,
    labelRegex: /^total$|total\s*amount|(?:اجمالي|إجمالي)\s*(?:القيمة|المبلغ)?|net\s*total/i,
    debugName: 'Total amount of purchase invoice',
  }).then((amountText) => {
    Cypress.log({ name: 'TotalPurchaseInvoice', message: amountText });
    // eslint-disable-next-line no-console
    console.log('Total amount of purchase invoice is', amountText);
    return amountText;
  });
};

export const submitPurchaseInvoice = () => {
  return saveAndSubmitDeliveryNote();
};

export const submitPurchaseInvoiceWithoutUpdateStock = () => {
  waitForOverlay();

  const findUpdateStockCheckbox = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const visibleContainer = $body.find('.layout-main-section:visible, .form-page:visible, .form-layout:visible').first();
      const container = visibleContainer.length ? visibleContainer : $body;

      return cy
        .wrap(container, { log: false })
        .scrollTo('bottom', { ensureScrollable: false, log: false })
        .then(() => cy.get('body', { timeout: LONG_TIMEOUT }))
        .then(($ctx) => {
          const scope = $ctx.find('.layout-main-section:visible, .form-page:visible, .form-layout:visible').first();
          const searchRoot = scope.length ? scope : $ctx;
          const candidates = searchRoot.find('#update_stock, input[data-fieldname="update_stock"]').toArray();
          const target = candidates.find((el) => Cypress.$(el).is(':visible') && !Cypress.$(el).prop('disabled'))
            || candidates.find((el) => !Cypress.$(el).prop('disabled'));

          if (target) return target;

          if (attempt >= 20) {
            throw new Error('update_stock checkbox was not found on Purchase Invoice page');
          }

          return cy.wait(250, { log: false }).then(() => findUpdateStockCheckbox(attempt + 1));
        });
    });

  return findUpdateStockCheckbox()
    .then((updateStockCheckbox) =>
      cy.wrap(updateStockCheckbox, { log: false })
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true })
        .then(($checkbox) => {
          if (Cypress.$($checkbox).is(':checked')) {
            return cy.wrap($checkbox, { log: false }).click({ force: true }).then(() => $checkbox);
          }
          return $checkbox;
        })
        .then(($checkbox) => {
          cy.wrap($checkbox, { log: false }).should('not.be.checked');
        })
    )
    .then(() =>
      cy
        .get('.layout-main-section:visible, .form-page:visible, .form-layout:visible, body', { timeout: LONG_TIMEOUT })
        .first()
        .scrollTo('top', { ensureScrollable: false, log: false })
    )
    .then(() => {
      waitForOverlay();
      return cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
        const normalize = (v) =>
          String(v || '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        const decodeLabel = (v) => {
          try {
            return decodeURIComponent(String(v || ''));
          } catch (e) {
            return String(v || '');
          }
        };

        const candidates = $body
          .find('button:visible, .btn:visible, [role="button"]:visible, [id^="appframe-btn-"]:visible')
          .toArray();

        let target = candidates.find((el) => {
          const cls = normalize(Cypress.$(el).attr('class'));
          return cls.includes('save-submit-action');
        });

        if (!target) {
          target = candidates.find((el) => {
            const $el = Cypress.$(el);
            const text = normalize($el.text());
            const dataLabel = normalize(decodeLabel($el.attr('data-label')));
            const action = normalize($el.attr('data-action_name') || $el.attr('data-action-name'));
            const byText = /\u062d\u0641\u0638\s*\u0648?\s*\u0627\u0639\u062a\u0645\u0627\u062f|save\s*and\s*submit/i.test(text)
              || /\u062d\u0641\u0638\s*\u0648?\s*\u0627\u0639\u062a\u0645\u0627\u062f|save\s*and\s*submit/i.test(dataLabel);
            return byText || action === 'submit';
          });
        }

        if (!target) {
          throw new Error('Could not find visible "Save and Submit" button');
        }

        return cy.wrap(target, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true });
      });
    })
    .then(() => {
      const yesSelector = '.btn.btn-primary.btn-sm.btn-modal-primary:visible, .btn.btn-yes:visible, .modal-dialog:visible button:visible';
      const clickYesIfPresent = (attempt = 0) =>
        cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
          const target = $body
            .find(yesSelector)
            .toArray()
            .find((el) => {
              const $el = Cypress.$(el);
              const text = String($el.text() || '').replace(/\s+/g, ' ').trim();
              return $el.is(':visible') && /\u0646\u0639\u0645|yes/i.test(text);
            });

          if (target) {
            return cy.wrap(target, { log: false })
              .scrollIntoView({ offset: { top: -120, left: 0 } })
              .click({ force: true });
          }

          if (attempt >= 20) return;
          return cy.wait(300, { log: false }).then(() => clickYesIfPresent(attempt + 1));
        });

      return clickYesIfPresent();
    });
};

export const submitDebitNote = () => {
  return submitPurchaseInvoice();
};

export const openCreateMenuAndChoose = (choicePatterns) => {
  waitForOverlay();

  const createBtnSelector = 'button:visible, .btn:visible, [role="button"]:visible, a:visible';
  const createDropdownSelector = 'button.btn.toolbar-btn.btn-primary:visible, .btn.toolbar-btn.btn-primary:visible';
  const createBtnPattern = /\u0625\u0646\u0634\u0627\u0621|\u0627\u0646\u0634\u0627\u0621|create/i;
  const normalize = (v) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const decodeLabel = (v) => {
    try {
      return decodeURIComponent(String(v || ''));
    } catch (e) {
      return String(v || '');
    }
  };
  const normalizedPatterns = choicePatterns.map((p) => normalize(p));

  const clickCreateMenuButton = () =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const target = $body
        .find(createDropdownSelector)
        .toArray()
        .find((el) => {
          const text = (Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim();
          return createBtnPattern.test(text);
        });

      if (target) {
        return cy.wrap(target, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true });
      }

      return cy.contains(createBtnSelector, createBtnPattern, { timeout: LONG_TIMEOUT })
        .first()
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .click({ force: true });
    });

  const clickChoice = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const candidates = $body
        .find('.dropdown-menu:visible .dropdown-item:visible, .show .dropdown-item:visible, [role="menu"]:visible [role="menuitem"]:visible, [role="menuitem"]:visible')
        .toArray();

      const target = candidates.find((el) => {
        const $el = Cypress.$(el);
        const text = normalize($el.text());
        const dataLabel = normalize(decodeLabel($el.attr('data-label')));
        return normalizedPatterns.some((p) => text.includes(p) || dataLabel.includes(p));
      });

      if (target) {
        return cy.wrap(target, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true });
      }

      if (attempt >= 20) {
        throw new Error(`Create menu choice not found for patterns: ${choicePatterns.join(', ')}`);
      }

      return clickCreateMenuButton()
        .then(() => cy.wait(250, { log: false }))
        .then(() => clickChoice(attempt + 1));
    });

  return clickCreateMenuButton()
    .then(() => clickChoice())
    .then(() => {
      waitForOverlay();
    });
};

export const saveAndSubmitPaymentDoc = (refNum) => {
  typeFirstExisting(['input[data-fieldname="reference_no"]'], refNum, 'Reference number');
  clickFirstExisting(['.save-submit-action.toolbar-btn', '[data-action_name="Submit"]'], 'Submit payment');
  cy.contains(
    '.btn.btn-primary.btn-sm.btn-modal-primary:visible, .btn.btn-yes:visible, .modal-dialog:visible button:visible, .page-form:visible button:visible, .page-form:visible .btn:visible',
    /\u0646\u0639\u0645/i,
    { timeout: LONG_TIMEOUT }
  )
    .first()
    .scrollIntoView({ offset: { top: -120, left: 0 } })
    .click({ force: true });
  waitForOverlay();
};

export const applyWriteOffAmount = (value) => {
  clickFirstExisting(['#sales-invoice-payments_tab-tab', '[data-fieldname="payments"]'], 'Payments tab');
  typeFirstExisting(['#write_off_amount', 'input[data-fieldname="write_off_amount"]'], value, 'Write-off amount');
};

export const applyDiscountAmount = (value) => {
  clickFirstExisting(['[data-fieldname="totals"]', '#sales-invoice-custom_taxes_and_charges-tab'], 'Totals/discount section');
  typeFirstExisting(['#discount_amount', 'input[data-fieldname="discount_amount"]'], value, 'Discount amount');
};

export const removeTaxesIfPresent = () => {
  clickFirstExisting(['#sales-invoice-custom_taxes_and_charges-tab', '[data-fieldname="taxes"]'], 'Taxes tab');
  cy.get('body').then(($body) => {
    const check = $body.find('[data-fieldname="taxes"] input[type="checkbox"]');
    if (check.length) cy.wrap(check[0]).click({ force: true });
    const remove = $body.find('[data-fieldname="taxes"] [data-action="delete_rows"]');
    if (remove.length) cy.wrap(remove[0]).click({ force: true });
  });
  waitForOverlay();
};

export const readOutstandingAmount = () =>
  cy
    .get('[data-fieldname="outstanding_amount"] span, [for="outstanding_amount"] ~ * span', { timeout: LONG_TIMEOUT })
    .first()
    .invoke('text')
    .then((v) => Number(normalizeNumStr(v)));

export const openDataMigrationTool = () => {
  clickFirstExisting(['.fa-search', '.search-trigger'], 'Search icon');
  typeFirstExisting(['.search__input'], 'data migration', 'Global search input');
  clickFirstExisting(['a[href*="data-migration-from-dafater4-tool"]'], 'Data migration tool option');
  waitForOverlay();
};

export const fillDataMigrationCredentials = ({ clientKey, secretKey }) => {
  typeFirstExisting(['input[id*="api_key"]', '.input-with-feedback.form-control'], clientKey, 'Client/API key input');
  cy.get('input.input-with-feedback.form-control', { timeout: LONG_TIMEOUT }).then(($inputs) => {
    if ($inputs.length > 1) {
      cy.wrap($inputs[1]).clear({ force: true }).type(String(secretKey), { force: true });
    } else {
      typeFirstExisting(['input[id*="secret"], input[type="password"]'], secretKey, 'Secret key input');
    }
  });
};

export const saveDataMigrationConfig = () => {
  clickFirstExisting(['[data-action_name="Save"]', '#appframe-btn-save'], 'Save data migration config');
  waitForOverlay();
};

export const checkVmConnection = () => {
  clickFirstExisting(['#check_vm_connection'], 'Check VM connection button');
  waitForOverlay();
};

export const syncDocTypes = () => {
  cy.get('body').then(($body) => {
    const allCheckbox = $body.find('.grid-heading-row.with-filter input[type="checkbox"]');
    if (allCheckbox.length) cy.wrap(allCheckbox[0]).click({ force: true });
  });
  clickFirstExisting(['#sync_doctypes_data'], 'Sync DocTypes button');
  waitForOverlay();
};

export const readToastMessage = () =>
  cy
    .get('.msgprint', { timeout: LONG_TIMEOUT })
    .should('be.visible')
    .invoke('text')
    .then((t) => t.trim());

export const setupWizardIfPresent = ({ companyName, companyId, taxId, city, address, phone }) => {
  cy.get('body').then(($body) => {
    const countryField = $body.find('#country');
    if (!countryField.length) return;

    const nextBtn = $body.find('.next-btn.btn.btn-default.btn-sm.btn-primary');
    if (nextBtn.length) cy.wrap(nextBtn[0]).click({ force: true });

    cy.get('#password', { timeout: LONG_TIMEOUT }).clear({ force: true }).type('123456', { force: true });
    cy.get('.next-btn.btn.btn-default.btn-sm.btn-primary', { timeout: LONG_TIMEOUT }).click({ force: true });

    typeFirstExisting(['#company_name'], companyName, 'Setup company name');
    typeFirstExisting(['#company_id'], companyId, 'Setup company id');
    typeFirstExisting(['#tax_id'], taxId, 'Setup tax id');
    typeFirstExisting(['#city'], city, 'Setup city');
    typeFirstExisting(['#address_line1'], address, 'Setup address');
    typeFirstExisting(['#phone'], phone, 'Setup phone');

    cy.get('body').then(($b) => {
      const complete = $b.find('.complete-btn.btn.btn-sm.primary.btn-primary');
      if (complete.length) cy.wrap(complete[0]).click({ force: true });
    });
    waitForOverlay();
  });
};

export const captureReportMetric = () => {
  waitForOverlay();
  cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const loadBtn = $body.find('[id*="appframe-btn"], .btn.btn-default.btn-sm.toolbar-btn');
    if (loadBtn.length) {
      const withLoadText = Array.from(loadBtn).find((el) => Cypress.$(el).text().includes('?????') || Cypress.$(el).text().toLowerCase().includes('load'));
      if (withLoadText) cy.wrap(withLoadText).click({ force: true });
    }
  });
  waitForOverlay();

  return cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
    const candidates = $body
      .find('table tbody td, .report-wrapper td, .text-right, .text-end, .summary-value, .number-card-value')
      .toArray()
      .map((el) => Cypress.$(el).text().trim())
      .filter((t) => /-?\d+[\d,]*(\.\d+)?/.test(t));

    if (!candidates.length) {
      return '0';
    }
    return normalizeNumStr(candidates[0]);
  });
};

export const compareReportAcrossV4V5 = ({ reportSelectors }) => {
  const env = getMigrationEnv();

  login({ url: env.v4Url, username: env.user4, password: env.pass4 });
  openReportBySelectors(reportSelectors, 'Report');
  captureReportMetric().as('metricV4');

  login({ url: env.v5Url, username: env.user5, password: env.pass5 });
  openReportBySelectors(reportSelectors, 'Report');
  captureReportMetric().as('metricV5');

  cy.get('@metricV4').then((m4) => {
    cy.get('@metricV5').then((m5) => {
      expect(m5).to.not.equal('');
      expect(m4).to.not.equal('');
      expect(m5).to.equal(m4);
    });
  });
};

export const openGeneralLedgerReport = () => {
  waitForOverlay();

  const viewBtnXpath = "(//*[normalize-space()='واجهة' and contains(@class, 'btn btn-default toolbar-btn')])[3]";
  const generalLedgerPattern = /\u062f\u0641\u062a\u0631\s*\u0627\u0644(?:\u0627|\u0623)\u0633\u062a\u0627\u0630\s*\u0627\u0644\u0639\u0627\u0645|\u0645\u0648\u0627\u0632\u0646\u0629\s*\u062f\u0641\u062a\u0631\s*\u0627\u0644(?:\u0627|\u0623)\u0633\u062a\u0627\u0630|general\s*ledger/i;
  const closeIconSelector = '.modal-dialog:visible .close:visible, .modal-dialog:visible [data-dismiss="modal"]:visible, .msgprint:visible .close:visible';
  const blockerSelector = '.modal-dialog:visible, .msgprint:visible';
  const blockerActionSelector = '.modal-dialog:visible button:visible, .modal-dialog:visible .btn:visible, .msgprint:visible button:visible, .msgprint:visible .btn:visible';

  const dismissBlockingPopup = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const hasBlocker = $body.find(blockerSelector).length > 0;
      if (!hasBlocker) return;

      const closeTarget = $body.find(closeIconSelector).toArray()[0];
      if (closeTarget) {
        return cy.wrap(closeTarget, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true })
          .then(() => {
            waitForOverlay();
          })
          .then(() => dismissBlockingPopup(attempt + 1));
      }

      const actionTarget = $body
        .find(blockerActionSelector)
        .toArray()
        .find((el) => {
          const txt = String(Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim().toLowerCase();
          return /نعم|yes|ok|موافق|اغلاق|إغلاق|close/.test(txt);
        });

      if (actionTarget) {
        return cy.wrap(actionTarget, { log: false })
          .scrollIntoView({ offset: { top: -120, left: 0 } })
          .click({ force: true })
          .then(() => {
            waitForOverlay();
          })
          .then(() => dismissBlockingPopup(attempt + 1));
      }

      if (attempt >= 8) return;

      return cy.get('body', { log: false })
        .type('{esc}', { force: true })
        .wait(200, { log: false })
        .then(() => dismissBlockingPopup(attempt + 1));
    });

  const clickViewButton = () =>
    cy.xpath(viewBtnXpath, { timeout: LONG_TIMEOUT })
      .scrollIntoView({ block: 'center', inline: 'center' })
      .click({ force: true });

  return cy
    .then(() => dismissBlockingPopup())
    .then(() => {
      waitForOverlay();
    })
    .then(() => dismissBlockingPopup())
    .then(() => {
      waitForOverlay();
    })
    .then(() => clickViewButton())
    .then(() =>
      cy.contains('a:visible, button:visible, [role="menuitem"]:visible, .dropdown-item:visible', generalLedgerPattern, { timeout: LONG_TIMEOUT })
        .first()
        .scrollIntoView({ offset: { top: -120, left: 0 } })
        .should('be.visible')
        .click({ force: true })
    )
    .then(() => {
      waitForOverlay();
    });
};

export const openGeneralLedgerReportFromSalesInvoice = () => {
  waitForOverlay();

  const generalLedgerPattern = /\u062f\u0641\u062a\u0631\s*\u0627\u0644(?:\u0627|\u0623)\u0633\u062a\u0627\u0630\s*\u0627\u0644\u0639\u0627\u0645|\u0645\u0648\u0627\u0632\u0646\u0629\s*\u062f\u0641\u062a\u0631\s*\u0627\u0644(?:\u0627|\u0623)\u0633\u062a\u0627\u0630|general\s*ledger/i;
  const closeIconSelector = '.modal-dialog:visible .close:visible, .modal-dialog:visible [data-dismiss=\"modal\"]:visible, .msgprint:visible .close:visible';
  const blockerSelector = '.modal-dialog:visible, .msgprint:visible';
  const blockerActionSelector = '.modal-dialog:visible button:visible, .modal-dialog:visible .btn:visible, .msgprint:visible button:visible, .msgprint:visible .btn:visible';

  const dismissBlockingPopup = (attempt = 0) =>
    cy.get('body', { timeout: LONG_TIMEOUT }).then(($body) => {
      const hasBlocker = $body.find(blockerSelector).length > 0;
      if (!hasBlocker) return;

      const closeTarget = $body.find(closeIconSelector).toArray()[0];
      if (closeTarget) {
        return cy.wrap(closeTarget, { log: false })
          .scrollIntoView()
          .click({ force: true })
          .then(() => {
            waitForOverlay();
          })
          .then(() => dismissBlockingPopup(attempt + 1));
      }

      const actionTarget = $body
        .find(blockerActionSelector)
        .toArray()
        .find((el) => {
          const txt = String(Cypress.$(el).text() || '').replace(/\s+/g, ' ').trim().toLowerCase();
          return /نعم|yes|ok|موافق|اغلاق|إغلاق|close/.test(txt);
        });

      if (actionTarget) {
        return cy.wrap(actionTarget, { log: false })
          .scrollIntoView()
          .click({ force: true })
          .then(() => {
            waitForOverlay();
          })
          .then(() => dismissBlockingPopup(attempt + 1));
      }

      if (attempt >= 8) return;

      return cy.get('body', { log: false })
        .type('{esc}', { force: true })
        .wait(200, { log: false })
        .then(() => dismissBlockingPopup(attempt + 1));
    });

  const clickSalesInvoiceViewButton = () =>
    cy.window({ timeout: LONG_TIMEOUT })
      .then((win) => {
        win.scrollTo(0, 0);
      })
      .then(() => cy.get('body', { timeout: LONG_TIMEOUT }))
      .then(($body) => {
        // Scroll inside Sales Invoice form containers to ensure top toolbar actions are rendered/visible.
        [
          '.layout-main-section:visible',
          '.form-page:visible',
          '.form-tab-content:visible',
          '.page-content:visible',
          '.page-body:visible',
        ].forEach((selector) => {
          $body.find(selector).each((_, el) => {
            if (el && typeof el.scrollTop === 'number') {
              el.scrollTop = 0;
            }
          });
        });
      })
      .then(() =>
        cy.xpath(
          "//*[normalize-space()='واجهة' and contains(@class, 'btn') and contains(@class, 'btn-default') and contains(@class, 'toolbar-btn')]",
          { timeout: LONG_TIMEOUT }
        )
          .then(($viewBtns) => {
            if (!$viewBtns.length) {
              throw new Error('No "واجهة" button found on Sales Invoice page');
            }

            // Prefer the 2nd "واجهة" button when available, otherwise fallback to the first one.
            const targetViewBtn = $viewBtns.toArray()[1] || $viewBtns.toArray()[0];

            return cy.wrap(targetViewBtn, { log: false })
              .scrollIntoView({ block: 'center', inline: 'center' })
              .click({ force: true });
          })
      );

  return cy
    .then(() => dismissBlockingPopup())
    .then(() => {
      waitForOverlay();
    })
    .then(() => dismissBlockingPopup())
    .then(() => {
      waitForOverlay();
    })
    .then(() => clickSalesInvoiceViewButton())
    .then(() =>
      cy.contains('a:visible, button:visible, [role=\"menuitem\"]:visible, .dropdown-item:visible', generalLedgerPattern, { timeout: LONG_TIMEOUT })
        .first()
        .scrollIntoView()
        .should('be.visible')
        .click({ force: true })
    )
    .then(() => {
      waitForOverlay();
    });
};
