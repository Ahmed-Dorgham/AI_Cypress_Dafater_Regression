/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openDeliveryNotesList,
  readTotalRowsCount,
} from '../support/migrationHelpers';

describe('ComparingDeliveryNotesTest (Migrated from Selenium)', () => {
  it('TC01_comparingNumberOfDeliveryNotes', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openDeliveryNotesList();
    readTotalRowsCount().as('beforeCount');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openDeliveryNotesList();
    readTotalRowsCount().as('afterCount');

    cy.get('@beforeCount').then((beforeCount) => {
      cy.get('@afterCount').should('eq', beforeCount);
    });
  });

  it('TC02_comparingDeliveryNotesData', () => {
    cy.log('TODO: Migrate detailed document-level field validation for Delivery Note data parity.');
  });
});
