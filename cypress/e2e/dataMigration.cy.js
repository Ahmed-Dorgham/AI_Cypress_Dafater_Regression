/// <reference types="cypress" />

import {
  getMigrationEnv,
  login,
  openDataMigrationTool,
  fillDataMigrationCredentials,
  saveDataMigrationConfig,
  checkVmConnection,
  syncDocTypes,
  readToastMessage,
} from '../support/migrationHelpers';

describe('DataMigrationTest (Migrated from Selenium)', () => {
  const clientKey = Cypress.expose('DAFATER_CLIENT_KEY') || 'hmce-v4';
  const validSecret = Cypress.expose('DAFATER_SECRET_KEY') || '3zFG68L4T89';
  const invalidSecret = Cypress.expose('DAFATER_INVALID_SECRET_KEY') || 'kX7NY9yMSag4';

  it('TC01_checkFailureVmConnection', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openDataMigrationTool();
    fillDataMigrationCredentials({ clientKey, secretKey: invalidSecret });
    saveDataMigrationConfig();
    checkVmConnection();
    readToastMessage().then((msg) => {
      expect(msg).to.include('Cannot Connect');
    });
  });

  it('TC02_checkSuccessVmConnection', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openDataMigrationTool();
    fillDataMigrationCredentials({ clientKey, secretKey: validSecret });
    saveDataMigrationConfig();
    checkVmConnection();
    readToastMessage().then((msg) => {
      expect(msg).to.include('Connected Successfully');
    });
  });

  it('TC03_syncDocTypesData', () => {
    const env = getMigrationEnv();
    login({ url: env.v5Url, username: env.user5, password: env.pass5 });
    openDataMigrationTool();
    fillDataMigrationCredentials({ clientKey, secretKey: validSecret });
    saveDataMigrationConfig();
    syncDocTypes();
    readToastMessage().then((msg) => {
      expect(msg).to.include('Enqueued Sync Data Method in Background');
    });
  });
});

