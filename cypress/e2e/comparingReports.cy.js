/// <reference types="cypress" />

import { compareReportAcrossV4V5 } from '../support/migrationHelpers';

const reports = {
  gl: ['#report-general-ledger', 'a[href*="/app/query-report/General Ledger"]'],
  customersAging: ['#report-customers-aging', 'a[href*="/app/query-report/Customers Aging"]'],
  taxDeclaration: ['#page-report-tax-declaration', 'a[href*="/app/tax-declaration"]'],
  stockBalance: ['#report-stock-balance', 'a[href*="/app/query-report/Stock Balance"]'],
  trialBalance: ['#report-trial-balance', 'a[href*="/app/query-report/Dafater Trial Balance"]'],
  balanceSheet: ['a[href*="/app/query-report/Balance Sheet"]'],
  profitLoss: ['a[href*="/app/query-report/Profit and Loss Statement"]'],
  grossProfit: ['#report-gross-profit', 'a[href*="/app/query-report/Gross Profit"]'],
  supplierAging: ['#report-suppliers-aging-details', 'a[href*="/app/query-report/Accounts Payable"]'],
  salesPersonDetailed: ['#report-sales-person-detailed-report', 'a[href*="/app/query-report/Sales person Detailed Report"]'],
  monthlySalary: ['#report-monthly-salary-register', 'a[href*="/app/query-report/Monthly Salary Register"]'],
  employeeLeave: ['#report-employee-leave-balance', 'a[href*="/app/query-report/Employee Leave Balance Summary"]'],
};

describe('ComparingReportsTest (Migrated from Selenium)', () => {
  it('TC01_comparingGeneralLedgerReportWithSpecificAccount', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.gl });
  });

  it('TC02_comparingGeneralLedgerReportWithoutFiltration', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.gl });
  });

  it('TC03_comparingCustomersAgingReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.customersAging });
  });

  it('TC04_comparingTaxDeclarationReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.taxDeclaration });
  });

  it('TC05_comparingStockBalanceReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.stockBalance });
  });

  it('TC06_comparingTrialBalanceReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.trialBalance });
  });

  it('TC07_comparingBalanceSheetReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.balanceSheet });
  });

  it('TC08_comparingProfitAndLossReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.profitLoss });
  });

  it('TC09_comparingGrossProfitReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.grossProfit });
  });

  it('TC010_comparingSupplierAgingDetailsReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.supplierAging });
  });

  it('TC011_comparingSalesPersonDetailedReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.salesPersonDetailed });
  });

  it('TC012_comparingMonthlySalaryRegisterReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.monthlySalary });
  });

  it('TC013_comparingEmployeeLeaveBalanceReport', () => {
    compareReportAcrossV4V5({ reportSelectors: reports.employeeLeave });
  });
});
