# SentinelPay Frontend

The simulated mobile money and financial ledger frontend for SentinelPay, built in the style of bKash and Nagad for university database education.

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v20/v24)
- **npm**: v9+

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
The application will launch on [http://localhost:5173](http://localhost:5173).

### 4. Build for Production
```bash
npm run build
```
Generates production-ready, minified static files in `frontend/dist/`.

---

## Switching Between Mock & Real Backend

By default, the frontend runs in **Mock Mode** using a stateful in-memory database (`mock/db.js`) that simulates realistic network latency (250–500ms) and enforces balanced double-entry ledger journals.

To switch to the real Express backend API:
1. Create or edit `frontend/.env.local`:
   ```env
   VITE_USE_MOCK=false
   ```
2. Restart the Vite dev server (`npm run dev`).
3. Requests will now route to `/api/...`, proxied automatically to `http://localhost:3000`.

---

## Demo Accounts

On the `/login` page, a **Demo accounts** row allows one-click auto-fill for each role:

| Role | Phone | Password | Starting Wallet Balance | Role Home |
|---|---|---|---|---|
| **Customer** | `01711111111` | `demo1234` | ৳ 3,795.00 | `/dashboard` |
| **Agent** | `01733333333` | `demo1234` | ৳ 95,000.00 (Float) | `/agent` |
| **Fraud Analyst** | `01700000001` | `demo1234` | — | `/fraud/alerts` |
| **Administrator** | `01700000000` | `demo1234` | — | `/admin` |
| **Auditor** | `01788888888` | `demo1234` | — | `/admin/ledger` |

---

## Folder Map

```
frontend/
├── index.html
├── package.json
├── vite.config.js               # Dev proxy /api -> localhost:3000 & Rollup chunking
├── tailwind.config.js           # Semantic tokens (canvas, surface, primary, etc.)
├── postcss.config.js
├── .env.example                 # VITE_USE_MOCK=true
├── FRONTEND_NOTES.md            # Route map, component list, and architecture decisions
└── src/
    ├── api/                     # Domain modules + HTTP client
    │   ├── config.js            # USE_MOCK flag
    │   ├── http.js              # Real fetch client with credentials: include
    │   ├── auth.js
    │   ├── wallets.js
    │   ├── transactions.js
    │   ├── agent.js
    │   ├── fraud.js
    │   ├── admin.js
    │   └── reference.js
    ├── mock/                    # In-memory realistic database
    │   ├── data.js              # Seed entities & initial state
    │   ├── db.js                # In-memory store, ledger posting & trial balance
    │   └── delay.js             # Simulated network latency (250–500ms)
    ├── auth/                    # Authentication & RBAC
    │   ├── AuthContext.jsx      # Auth state & session persistence
    │   ├── ProtectedRoute.jsx   # Role enforcement & redirect logic
    │   └── RoleGate.jsx         # Conditional role element rendering
    ├── components/
    │   ├── ui/                  # 18 custom accessible UI components (no libraries)
    │   │   ├── Button.jsx, Input.jsx, Select.jsx, Textarea.jsx
    │   │   ├── Card.jsx, DataTable.jsx, StatusBadge.jsx, MoneyText.jsx
    │   │   ├── Modal.jsx, ConfirmDialog.jsx, Toast.jsx, Tabs.jsx
    │   │   ├── Stepper.jsx, Skeleton.jsx, EmptyState.jsx, ErrorState.jsx
    │   │   └── Pagination.jsx, FilterBar.jsx, Timeline.jsx, KeyValue.jsx
    │   ├── layout/              # Shell, Sidebar, Topbar, PageHeader
    │   └── StyleGuide.jsx       # Component testing bench at /styleguide
    ├── features/                # Route pages by domain
    │   ├── auth/                # Login, Register, DemoAccounts
    │   ├── customer/            # Dashboard, Statement, Send money, History, Receipt, Beneficiaries, Wallets, Profile
    │   ├── agent/               # Counter dashboard, Cash in, Cash out, History
    │   ├── fraud/               # Alerts list, Alert detail, Cases list, Case detail, Analytics
    │   ├── admin/               # System overview, Users, User detail, Agents, Wallets, Fees, Risk rules, Transactions, Ledger, Audit log
    │   └── common/              # NotFoundPage (404)
    ├── lib/                     # Utilities
    │   ├── money.js             # Integer paisa arithmetic (prevents float errors)
    │   ├── format.js            # BDT currency, en-IN grouping, Asia/Dhaka timestamps
    │   ├── errors.js            # Error codes to human-readable banking messages
    │   ├── constants.js         # Roles, statuses, severities, limit tiers
    │   ├── validators.js        # Phone, amount, and required validators
    │   └── useAsync.js          # Custom async data loading hook
    ├── App.jsx
    ├── main.jsx
    ├── routes.jsx
    └── index.css
```
