/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openItemsList,
  readItemIndicatorCount,
} from '../support/migrationHelpers';

describe('ComparingItemsTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfItems', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openItemsList();
    readItemIndicatorCount(0).as('allBefore');
    readItemIndicatorCount(1).as('salesBefore');
    readItemIndicatorCount(2).as('purchaseBefore');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openItemsList();
    readItemIndicatorCount(0).as('allAfter');
    readItemIndicatorCount(1).as('salesAfter');
    readItemIndicatorCount(2).as('purchaseAfter');

    cy.get('@allBefore').then((allBefore) => {
      cy.get('@allAfter').should('eq', allBefore);
    });

    cy.get('@salesBefore').then((salesBefore) => {
      cy.get('@salesAfter').should('eq', salesBefore);
    });

    cy.get('@purchaseBefore').then((purchaseBefore) => {
      cy.get('@purchaseAfter').should('eq', purchaseBefore);
    });
  });
});
