import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import AppShell from './components/layout/AppShell';

// Auth
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

// Customer
import CustomerDashboardPage from './features/customer/CustomerDashboardPage';
import WalletStatementPage from './features/customer/WalletStatementPage';
import SendMoneyPage from './features/customer/SendMoneyPage';
import TransactionHistoryPage from './features/customer/TransactionHistoryPage';
import TransactionReceiptPage from './features/customer/TransactionReceiptPage';
import BeneficiariesPage from './features/customer/BeneficiariesPage';
import MyWalletsPage from './features/customer/MyWalletsPage';
import ProfilePage from './features/customer/ProfilePage';

// Agent
import AgentDashboardPage from './features/agent/AgentDashboardPage';
import CashInPage from './features/agent/CashInPage';
import CashOutPage from './features/agent/CashOutPage';
import AgentHistoryPage from './features/agent/AgentHistoryPage';

// Fraud
import AlertsListPage from './features/fraud/AlertsListPage';
import AlertDetailPage from './features/fraud/AlertDetailPage';
import CasesListPage from './features/fraud/CasesListPage';
import CaseDetailPage from './features/fraud/CaseDetailPage';
import FraudAnalyticsPage from './features/fraud/FraudAnalyticsPage';

// Admin & Auditor
import AdminDashboardPage from './features/admin/AdminDashboardPage';
import UsersListPage from './features/admin/UsersListPage';
import UserDetailPage from './features/admin/UserDetailPage';
import AgentsListPage from './features/admin/AgentsListPage';
import WalletsListPage from './features/admin/WalletsListPage';
import FeeRulesPage from './features/admin/FeeRulesPage';
import RiskRulesPage from './features/admin/RiskRulesPage';
import AdminTransactionsPage from './features/admin/AdminTransactionsPage';
import LedgerPage from './features/admin/LedgerPage';
import AuditLogPage from './features/admin/AuditLogPage';

// Common
import NotFoundPage from './features/common/NotFoundPage';
import StyleGuide from './components/StyleGuide';

function RootRedirect() {
  const { user, loading, getRoleHome } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHome()} replace />;
}

function PublicAuthRoute({ children }) {
  const { user, loading, getRoleHome } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={getRoleHome()} replace />;
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public auth routes */}
      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <LoginPage />
          </PublicAuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicAuthRoute>
            <RegisterPage />
          </PublicAuthRoute>
        }
      />

      {/* Styleguide test bench */}
      <Route path="/styleguide" element={<StyleGuide />} />

      {/* Protected routes wrapped in AppShell */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {/* Customer routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
              <CustomerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallets"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
              <MyWalletsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallets/:id"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
              <WalletStatementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/send"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
              <SendMoneyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
              <TransactionHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions/:id"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN', 'AGENT']}>
              <TransactionReceiptPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/beneficiaries"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
              <BeneficiariesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Agent routes */}
        <Route
          path="/agent"
          element={
            <ProtectedRoute allowedRoles={['AGENT', 'ADMIN']}>
              <AgentDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent/cash-in"
          element={
            <ProtectedRoute allowedRoles={['AGENT', 'ADMIN']}>
              <CashInPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent/cash-out"
          element={
            <ProtectedRoute allowedRoles={['AGENT', 'ADMIN']}>
              <CashOutPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent/history"
          element={
            <ProtectedRoute allowedRoles={['AGENT', 'ADMIN']}>
              <AgentHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Fraud Analyst routes */}
        <Route
          path="/fraud/alerts"
          element={
            <ProtectedRoute allowedRoles={['FRAUD_ANALYST', 'ADMIN']}>
              <AlertsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fraud/alerts/:id"
          element={
            <ProtectedRoute allowedRoles={['FRAUD_ANALYST', 'ADMIN']}>
              <AlertDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fraud/cases"
          element={
            <ProtectedRoute allowedRoles={['FRAUD_ANALYST', 'ADMIN']}>
              <CasesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fraud/cases/:id"
          element={
            <ProtectedRoute allowedRoles={['FRAUD_ANALYST', 'ADMIN']}>
              <CaseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fraud/analytics"
          element={
            <ProtectedRoute allowedRoles={['FRAUD_ANALYST', 'ADMIN']}>
              <FraudAnalyticsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin only routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UsersListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <UserDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/agents"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AgentsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/wallets"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <WalletsListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/fees"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <FeeRulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/risk-rules"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <RiskRulesPage />
            </ProtectedRoute>
          }
        />

        {/* Admin & Auditor shared routes */}
        <Route
          path="/admin/transactions"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
              <AdminTransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ledger"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
              <LedgerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Inside Shell */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
