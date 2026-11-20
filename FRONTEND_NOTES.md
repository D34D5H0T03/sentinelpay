# SentinelPay Frontend Notes & Architecture Reference

## 1. Assumptions and Design Choices

When building the SentinelPay frontend, the simpler, cleaner approach was prioritized:
- **Authentication in Mock Mode:** Authentication state is persisted in `localStorage` (`sentinelpay_mock_user_id`). Logging in sets the user ID; navigating or refreshing the page calls `api/auth.js: me()` which reads the session ID and retrieves the user profile from the in-memory store.
- **Admin Navigation Structure:** To adhere to the maximum 7 items guidance while accommodating all platform services, the administrator navigation includes primary operational domains (Overview, Users, Agents, Wallets, Fees, Risk rules, Transactions, Ledger, Audit log), cleanly grouped with 16px icons.
- **Audit Log Presentation:** The audit log details view displays old and new snapshot state changes as a clean two-column JSON diff inside expandable table rows.
- **Auditor Role Scoping:** As requested in Section 8, the `AUDITOR` role has read-only access restricted strictly to Ledger, Transactions (read-only with the Reverse action button omitted), and Audit Log.
- **Idempotency Keys:** Every form submit that triggers a financial transfer (`SendMoneyPage`, `CashInPage`, `CashOutPage`, and Admin float loading) generates `crypto.randomUUID()` in a persistent React `useRef`. If a request is accidentally repeated or re-sent, the idempotency key ensures no duplicate money movement occurs.

---

## 2. Comprehensive Route Map

| Route Path | Page File | Components Used | API Functions Called |
|---|---|---|---|
| `/` | `routes.jsx` (`RootRedirect`) | — | `auth.me()` |
| `/login` | `features/auth/LoginPage.jsx` | `Input`, `Button`, `DemoAccounts` | `auth.login()` |
| `/register` | `features/auth/RegisterPage.jsx` | `Input`, `Button` | `auth.register()` |
| `/styleguide` | `components/StyleGuide.jsx` | All UI components | Demo mock data |
| `/dashboard` | `features/customer/CustomerDashboardPage.jsx` | `PageHeader`, `Card`, `Button`, `MoneyText`, `StatusBadge`, `DataTable`, `Skeleton`, `ErrorState` | `wallets.listWallets()`, `transactions.list()` |
| `/wallets` | `features/customer/MyWalletsPage.jsx` | `PageHeader`, `Card`, `Button`, `MoneyText`, `StatusBadge`, `Modal`, `Input`, `Skeleton`, `ErrorState` | `wallets.listWallets()`, `wallets.openWallet()` |
| `/wallets/:id` | `features/customer/WalletStatementPage.jsx` | `PageHeader`, `Card`, `MoneyText`, `StatusBadge`, `DataTable`, `FilterBar`, `Input`, `Button`, `Skeleton`, `ErrorState` | `wallets.getWallet()`, `wallets.getStatement()` |
| `/send` | `features/customer/SendMoneyPage.jsx` | `PageHeader`, `Stepper`, `Card`, `Input`, `Select`, `Textarea`, `Button`, `MoneyText`, `KeyValue`, `Skeleton`, `ErrorState` | `wallets.listWallets()`, `wallets.lookupWallet()`, `beneficiaries.list()`, `transactions.quote()`, `transactions.send()` |
| `/transactions` | `features/customer/TransactionHistoryPage.jsx` | `PageHeader`, `DataTable`, `FilterBar`, `Input`, `Select`, `StatusBadge`, `MoneyText`, `Skeleton`, `ErrorState` | `transactions.list()`, `wallets.listWallets()` |
| `/transactions/:id` | `features/customer/TransactionReceiptPage.jsx` | `PageHeader`, `Card`, `StatusBadge`, `MoneyText`, `KeyValue`, `Timeline`, `Skeleton`, `ErrorState` | `transactions.get()` |
| `/beneficiaries` | `features/customer/BeneficiariesPage.jsx` | `PageHeader`, `DataTable`, `Button`, `Modal`, `ConfirmDialog`, `Input`, `Skeleton`, `ErrorState` | `beneficiaries.list()`, `beneficiaries.create()`, `beneficiaries.update()`, `beneficiaries.remove()`, `wallets.lookupWallet()` |
| `/profile` | `features/customer/ProfilePage.jsx` | `PageHeader`, `Card`, `Button`, `Input`, `StatusBadge`, `KeyValue` | `auth.me()` |
| `/agent` | `features/agent/AgentDashboardPage.jsx` | `PageHeader`, `Card`, `Button`, `MoneyText`, `StatusBadge`, `DataTable`, `Skeleton`, `ErrorState` | `agent.dashboard()` |
| `/agent/cash-in` | `features/agent/CashInPage.jsx` | `PageHeader`, `Stepper`, `Card`, `Input`, `Button`, `MoneyText`, `StatusBadge`, `KeyValue` | `agent.dashboard()`, `agent.lookupCustomer()`, `agent.cashIn()` |
| `/agent/cash-out` | `features/agent/CashOutPage.jsx` | `PageHeader`, `Stepper`, `Card`, `Input`, `Button`, `MoneyText`, `StatusBadge`, `KeyValue` | `agent.dashboard()`, `agent.lookupCustomer()`, `agent.cashOut()` |
| `/agent/history` | `features/agent/AgentHistoryPage.jsx` | `PageHeader`, `DataTable`, `FilterBar`, `Input`, `Select`, `StatusBadge`, `MoneyText`, `Skeleton`, `ErrorState` | `agent.history()` |
| `/fraud/alerts` | `features/fraud/AlertsListPage.jsx` | `PageHeader`, `DataTable`, `FilterBar`, `Input`, `Select`, `Button`, `StatusBadge`, `Skeleton`, `ErrorState` | `fraud.listAlerts()`, `fraud.createCase()` |
| `/fraud/alerts/:id` | `features/fraud/AlertDetailPage.jsx` | `PageHeader`, `Card`, `Button`, `StatusBadge`, `MoneyText`, `Modal`, `Textarea`, `DataTable`, `KeyValue`, `Skeleton`, `ErrorState` | `fraud.getAlert()`, `fraud.updateAlert()`, `fraud.createCase()` |
| `/fraud/cases` | `features/fraud/CasesListPage.jsx` | `PageHeader`, `DataTable`, `FilterBar`, `Select`, `StatusBadge`, `Skeleton`, `ErrorState` | `fraud.listCases()` |
| `/fraud/cases/:id` | `features/fraud/CaseDetailPage.jsx` | `PageHeader`, `Card`, `Button`, `StatusBadge`, `Select`, `Textarea`, `Modal`, `DataTable`, `Timeline`, `Skeleton`, `ErrorState` | `fraud.getCase()`, `fraud.updateCase()`, `fraud.addCaseEvent()`, `fraud.closeCase()` |
| `/fraud/analytics` | `features/fraud/FraudAnalyticsPage.jsx` | `PageHeader`, `Card`, `Skeleton`, `ErrorState`, `Recharts` (`BarChart`, `LineChart`) | `fraud.stats()` |
| `/admin` | `features/admin/AdminDashboardPage.jsx` | `PageHeader`, `Card`, `MoneyText`, `StatusBadge`, `DataTable`, `Skeleton`, `ErrorState`, `Recharts` (`LineChart`) | `admin.dashboard()` |
| `/admin/users` | `features/admin/UsersListPage.jsx` | `PageHeader`, `DataTable`, `FilterBar`, `Input`, `Select`, `Button`, `StatusBadge`, `Modal`, `Skeleton`, `ErrorState` | `admin.listUsers()`, `admin.createStaff()` |
| `/admin/users/:id` | `features/admin/UserDetailPage.jsx` | `PageHeader`, `Card`, `Button`, `StatusBadge`, `MoneyText`, `DataTable`, `KeyValue`, `ConfirmDialog`, `Skeleton`, `ErrorState` | `admin.getUser()`, `admin.updateUserStatus()`, `admin.updateUserRoles()`, `admin.updateKyc()` |
| `/admin/agents` | `features/admin/AgentsListPage.jsx` | `PageHeader`, `DataTable`, `Card`, `Button`, `Input`, `Select`, `MoneyText`, `StatusBadge`, `Modal`, `ConfirmDialog`, `Skeleton`, `ErrorState` | `admin.listAgents()`, `admin.createAgent()`, `admin.loadFloat()` |
| `/admin/wallets` | `features/admin/WalletsListPage.jsx` | `PageHeader`, `DataTable`, `FilterBar`, `Input`, `Select`, `Button`, `MoneyText`, `StatusBadge`, `Modal`, `ConfirmDialog`, `Skeleton`, `ErrorState` | `admin.listWallets()`, `admin.setWalletStatus()`, `admin.listLimits()`, `admin.addLimit()`, `admin.endLimit()` |
| `/admin/fees` | `features/admin/FeeRulesPage.jsx` | `PageHeader`, `DataTable`, `Button`, `Input`, `Select`, `Modal`, `ConfirmDialog`, `Skeleton`, `ErrorState` | `admin.listFeeRules()`, `admin.createFeeRule()`, `admin.updateFeeRule()`, `admin.deleteFeeRule()` |
| `/admin/risk-rules` | `features/admin/RiskRulesPage.jsx` | `PageHeader`, `Card`, `Button`, `Input`, `Select`, `StatusBadge`, `Skeleton`, `ErrorState` | `admin.listRiskRules()`, `admin.updateRiskRule()`, `admin.saveRiskParams()`, `fraud.runRules()` |
| `/admin/transactions` | `features/admin/AdminTransactionsPage.jsx` | `PageHeader`, `DataTable`, `FilterBar`, `Input`, `Select`, `Button`, `StatusBadge`, `MoneyText`, `Modal`, `ConfirmDialog`, `Textarea`, `KeyValue`, `Skeleton`, `ErrorState` | `admin.listAllTransactions()`, `tx.get()`, `admin.reverseTransaction()` |
| `/admin/ledger` | `features/admin/LedgerPage.jsx` | `PageHeader`, `Card`, `Tabs`, `Button`, `Input`, `StatusBadge`, `MoneyText`, `Skeleton`, `ErrorState` | `admin.ledgerAccounts()`, `admin.trialBalance()`, `admin.getJournal()` |
| `/admin/audit` | `features/admin/AuditLogPage.jsx` | `PageHeader`, `FilterBar`, `Input`, `Select`, `Pagination`, `Skeleton`, `ErrorState` | `admin.auditLogs()` |
| `*` | `features/common/NotFoundPage.jsx` | `Button` | `auth.getRoleHome()` |

---

## 3. Architectural Decisions ("Why It Is Built This Way")

### 1. Token-Based Theme & Palette Design
The styling architecture adheres strictly to semantic Tailwind tokens (`canvas`, `surface`, `border`, `text`, `primary`, `success`, `warning`, `danger`, `neutral`). Instead of arbitrary colors or dark-mode toggles, SentinelPay mimics an authentic enterprise banking back-office tool: high legibility, WCAG AA compliance, 1px structural dividers, and zero visual noise (no gradients, glow effects, or decorative floating blobs). Crucially, **credits are green (`+`) while debits maintain standard text color (`-`)**—red is reserved strictly for errors, failed requests, and destructive actions.

### 2. Money as Strings & Integer Paisa Arithmetic
In accordance with banking database practices where monetary columns are defined as `DECIMAL(15,2)`, floating-point arithmetic is banned in `lib/money.js`. All operations convert decimal strings into integer paisa ($1\text{ Taka} = 100\text{ Paisa}$) before computing sums, differences, or fee percentages, and then reformat back into exact 2-decimal strings. This completely eliminates binary floating-point rounding errors (such as `0.1 + 0.2 = 0.30000000000000004`).

### 3. Append-Only Ledger & Dynamic Balance Derivation
Wallet balances are **never hardcoded or edited directly**. Balances are derived dynamically by evaluating all ledger entries associated with a wallet's account:
$$\text{Balance} = \sum \text{Credits} - \sum \text{Debits}$$
Every completed transaction produces an immutable, balanced journal entry where total debits equal total credits. As a result, the global trial balance sum across all system and wallet accounts is guaranteed to equal exactly `৳ 0.00`.

### 4. Zero-Dependency Shared Component Architecture
Rather than relying on third-party UI libraries (such as MUI, Chakra, or Shadcn) or external form and date libraries, every UI component (`Button`, `DataTable`, `Modal`, `Stepper`, `StatusBadge`, `MoneyText`, etc.) is custom-written in plain JavaScript. This guarantees that student developers can explain every single line of rendering, accessibility handling (focus traps, Escape dismissal, ARIA live announcements), and state flow during an oral database examination.

### 5. Seamless API & Mock Architecture
The application is decoupled from the storage layer via domain API modules (`src/api/*`). The environment flag `VITE_USE_MOCK` determines whether calls hit the in-memory store (`mock/db.js`) or make real `fetch` requests through `http.js` to `/api/*`. Because the mock store simulates realistic network latency (250–500ms) and mirrors the SQL procedure constraints, swapping to the real Express backend requires only setting `VITE_USE_MOCK=false` in `.env.local` without changing a single line of React code.

### 6. Role-Based Access Control (RBAC) & Route Protection
Five discrete roles (`CUSTOMER`, `AGENT`, `FRAUD_ANALYST`, `ADMIN`, `AUDITOR`) are enforced via `ProtectedRoute` and `RoleGate`. The `AUDITOR` role exemplifies strict access control: it has read-only visibility into the ledger, audit trail, and transaction list, but is explicitly barred from performing state-mutating actions (such as transaction reversals).
