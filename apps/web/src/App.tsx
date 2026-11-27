import { Routes, Route, Navigate } from 'react-router';
import { DashboardLayout } from './components/DashboardLayout';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home } from './pages/dashboard/Home';
import { Wallets } from './pages/dashboard/Wallets';
import { Cards } from './pages/dashboard/Cards';
import { Transfer } from './pages/transfer/Transfer';
import { Withdraw } from './pages/Withdraw';
import { Swap } from './pages/Swap';
import { LoanLayout } from './pages/loans/LoanLayout';
import { LoansHome } from './pages/loans/LoansHome';
import { LoanApply, LoanProductPage } from './pages/loans/LoanProductPage';
import { LoanForm } from './pages/loans/LoanForm';
import { LoanApplications } from './pages/loans/LoanApplications';
import { LoanDetail } from './pages/loans/LoanDetail';
import { LoanDocuments, LoanMessages, LoanOffers, LoanProfile, LoanUpdates } from './pages/loans/LoanPortalPages';
import { AdminLoanCase } from './pages/admin/AdminLoanCase';
import { TaxRecovery } from './pages/services/TaxRecovery';
import { RecoveryLayout } from './pages/recovery/RecoveryLayout';
import { RecoveryHome } from './pages/recovery/RecoveryHome';
import { NewApplication } from './pages/recovery/NewApplication';
import { ApplicationForm } from './pages/recovery/ApplicationForm';
import { Applications } from './pages/recovery/Applications';
import { ApplicationDetail } from './pages/recovery/ApplicationDetail';
import { DocumentCentre } from './pages/recovery/DocumentCentre';
import { RecoveryMessages } from './pages/recovery/Messages';
import { AdminRecoveryCase } from './pages/admin/AdminRecoveryCase';
import { Settings } from './pages/Settings';
import { Support } from './pages/Support';
import { AdminOverview } from './pages/admin/Overview';
import { AdminCustomers } from './pages/admin/Customers';
import { AdminCustomerDetail } from './pages/admin/CustomerDetail';
import { AdminApprovals } from './pages/admin/Approvals';
import { AdminTransactions } from './pages/admin/Transactions';
import { AdminCards } from './pages/admin/AdminCards';
import { AdminLoans } from './pages/admin/AdminLoans';
import { AdminTaxRefunds } from './pages/admin/AdminTaxRefunds';
import { AdminFundRecovery } from './pages/admin/AdminFundRecovery';
import { AdminSupport } from './pages/admin/SupportInbox';
import { AdminBankSettings } from './pages/admin/BankSettings';
import { AdminActivity } from './pages/admin/ActivityLog';
import { AdminMail } from './pages/admin/Mail';
import { Partnerships } from './pages/Partnerships';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Careers } from './pages/Careers';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Cookies } from './pages/Cookies';
import { Accessibility } from './pages/Accessibility';
import { Complaints } from './pages/Complaints';
import { ForgotPassword } from './pages/ForgotPassword';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/partnerships" element={<Partnerships />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/accessibility" element={<Accessibility />} />
      <Route path="/complaints" element={<Complaints />} />

      {/* Customer dashboard */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Home />} />
        <Route path="wallets" element={<Wallets />} />
        <Route path="cards" element={<Cards />} />
        <Route path="transfer" element={<Transfer />} />
        <Route path="withdraw" element={<Withdraw />} />
        <Route path="swap" element={<Swap />} />
        <Route path="loans" element={<LoanLayout />}>
          <Route index element={<LoansHome />} />
          <Route path="products/:key" element={<LoanProductPage />} />
          <Route path="apply" element={<LoanApply />} />
          <Route path="apply/:id" element={<LoanForm />} />
          <Route path="applications" element={<LoanApplications />} />
          <Route path="applications/:id" element={<LoanDetail />} />
          <Route path="documents" element={<LoanDocuments />} />
          <Route path="offers" element={<LoanOffers />} />
          <Route path="updates" element={<LoanUpdates />} />
          <Route path="messages" element={<LoanMessages />} />
          <Route path="profile" element={<LoanProfile />} />
        </Route>
        <Route path="tax-recovery" element={<TaxRecovery />} />
        <Route path="fund-recovery" element={<RecoveryLayout />}>
          <Route index element={<RecoveryHome />} />
          <Route path="new" element={<NewApplication />} />
          <Route path="apply/:id" element={<ApplicationForm />} />
          <Route path="applications" element={<Applications />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          <Route path="documents" element={<DocumentCentre />} />
          <Route path="messages" element={<RecoveryMessages />} />
        </Route>
        <Route path="settings" element={<Settings />} />
        <Route path="support" element={<Support />} />
        <Route path="admin" element={<Navigate to="/admin" replace />} />
      </Route>

      {/* Bank staff (admin) area */}
      <Route path="/admin" element={<DashboardLayout admin />}>
        <Route index element={<AdminOverview />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="customers/:id" element={<AdminCustomerDetail />} />
        <Route path="approvals" element={<AdminApprovals />} />
        <Route path="transactions" element={<AdminTransactions />} />
        <Route path="cards" element={<AdminCards />} />
        <Route path="loans" element={<AdminLoans />} />
        <Route path="loans/:id" element={<AdminLoanCase />} />
        <Route path="tax-refunds" element={<AdminTaxRefunds />} />
        <Route path="fund-recovery" element={<AdminFundRecovery />} />
        <Route path="fund-recovery/:id" element={<AdminRecoveryCase />} />
        <Route path="support" element={<AdminSupport />} />
        <Route path="mail" element={<AdminMail />} />
        <Route path="settings" element={<AdminBankSettings />} />
        <Route path="activity" element={<AdminActivity />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
