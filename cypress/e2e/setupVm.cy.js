/// <reference types="cypress" />

import { getMigrationEnv, login, setupWizardIfPresent } from '../support/migrationHelpers';

describe('SetupVmTest (Migrated from Selenium)', () => {
  it('TC01_setupVm', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });

    setupWizardIfPresent({
      companyName: 'testCompany',
      companyId: '123456789',
      taxId: '123456789',
      city: 'city',
      address: 'address',
      phone: '564123987',
    });

    cy.get('#module-anchor-Selling', { timeout: 120000 }).should('exist');
  });
});
