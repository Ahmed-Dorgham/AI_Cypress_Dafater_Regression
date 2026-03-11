/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openChartOfAccountsList,
  normalizeNumStr,
} from '../support/migrationHelpers';

describe('ComparingChartOfAccountsDataTest (Migrated from Selenium)', () => {
  const readChartMetric = (labelRegex) =>
    cy.contains('body *', labelRegex, { timeout: 120000 })
      .parent()
      .siblings()
      .find('span')
      .first()
      .invoke('text')
      .then((v) => normalizeNumStr(v));

  it('TC01_comparingChartOfAccountsDataTest', () => {
    const env = getMigrationEnv();

    login({ url: env.v4Url, username: env.user4, password: env.pass4 });
    openChartOfAccountsList();
    readChartMetric(/Assets|الاصول/i).as('assets4');
    readChartMetric(/liabilties|الالتزامات|حقوق الملكية/i).as('liab4');
    readChartMetric(/Revenu|الايرادات/i).as('rev4');
    readChartMetric(/Expenses|المصروفات|المصاريف/i).as('exp4');

    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openChartOfAccountsList();
    readChartMetric(/Assets|الاصول/i).as('assets5');
    readChartMetric(/liabilties|الالتزامات|حقوق الملكية/i).as('liab5');
    readChartMetric(/Revenu|الايرادات/i).as('rev5');
    readChartMetric(/Expenses|المصروفات|المصاريف/i).as('exp5');

    cy.get('@assets4').then((v4) => cy.get('@assets5').should('eq', v4));
    cy.get('@liab4').then((v4) => cy.get('@liab5').should('eq', v4));
    cy.get('@rev4').then((v4) => cy.get('@rev5').should('eq', v4));
    cy.get('@exp4').then((v4) => cy.get('@exp5').should('eq', v4));
  });
});
