# Personal Banking Note - Initial Plan

**Created**: 2025-11-20 08:00

## Overview

Email-based credit card transaction tracker with custom billing cycles per bank.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Auth**: NextAuth.js + Microsoft Azure AD
- **Database**: Prisma + SQLite
- **Email API**: Microsoft Graph API
- **UI**: Tailwind CSS + shadcn/ui (dark mode default)
- **Charts**: Recharts (donut chart)
- **Testing**: Jest + React Testing Library (TDD)

## Data Model

```typescript
Bank {
  id
  name              // "SMBC", "BCA"
  emailFilter       // "alerts@smbc.com"
  statementDay      // 21 (billing cycle starts)
  color
}

Transaction {
  id
  bankId
  emailId
  rawContent
  amount
  currency          // "IDR", "CNY", "USD"
  idr_amount        // null if not IDR
  merchant
  category
  date
}

Rule {
  id
  condition         // "contains"
  conditionValue    // "Grab"
  category          // "Transport"
  priority
}

Category {
  id
  name
  color
}
```

## UI Layout

**Dashboard (per bank):**
```
┌─────────────────────────────────────────────┐
│ [SMBC ▼]      [← October 2024 →]            │
├────────────┬────────────────────────────────┤
│   Donut    │  Transaction Table             │
│   (30%)    │        (70%)                   │
│ ────────── │                                │
│  Legend    │                                │
└────────────┴────────────────────────────────┘
```

- Dark mode by default
- Responsive: stacks on mobile (<1024px)

## Billing Cycle Logic

Each bank has custom statement day:
- SMBC (day 21): "October" = Oct 21 → Nov 20
- BCA (day 7): "July" = Jul 7 → Aug 6

## Currency Handling

- Store: `amount`, `currency`, `idr_amount`
- `idr_amount` is null if currency is not IDR
- Pie chart only shows IDR transactions
- Transaction table shows all currencies

## Email Sync

- Manual sync + auto-sync on app open
- Uses Microsoft Graph API to fetch emails
- Filters by sender (bank email)
- Parses amount, currency, merchant from email body

## Core Features

1. Microsoft Sign-In - OAuth for Outlook access
2. Bank Management - Add banks with email filter + statement day
3. Email Sync - Auto on open + manual "Sync Now"
4. Transaction Parser - Extract amount, currency, merchant
5. Classification Rules - "If contains X → Category Y"
6. Donut Chart - IDR transactions only, by category
7. Transaction Table - All currencies, newest first
8. Data Export - JSON backup

## Pages Structure

```
/              → Dashboard (default bank)
/banks         → Manage banks
/rules         → Classification rules
/categories    → Manage categories
/settings      → Export, account
/api/auth      → NextAuth
/api/sync      → Trigger email sync
/api/emails    → Fetch & parse
```

## Implementation Phases

### Phase 1: Project Setup
- Initialize Next.js + TypeScript
- Configure Jest + React Testing Library
- Set up Prisma + SQLite
- Tailwind + shadcn/ui with dark mode default
- Create database schema

### Phase 2: Authentication
- Write tests for auth flow
- Register Azure AD app
- Configure NextAuth with Microsoft
- Test token storage

### Phase 3: Bank & Email Management
- Tests for bank CRUD
- Tests for email fetching
- Microsoft Graph API client
- Store raw emails

### Phase 4: Parsing & Classification
- Tests for parser (amount, currency, merchant extraction)
- Tests for rules engine
- Implement parser + rules
- Auto-categorize transactions

### Phase 5: Dashboard UI
- Tests for components
- Bank selector + period navigator
- Donut chart with legend
- Transaction table
- Responsive layout

### Phase 6: Polish
- Historical import
- Export to JSON
- Settings page
- E2E tests

---

## Status

- [x] Phase 1: Project Setup (Completed 2025-11-20)
- [x] Phase 2: Authentication (Completed 2025-11-20)
- [x] Phase 3: Bank & Email Management (Completed 2025-11-20)
- [x] Phase 4: Parsing & Classification (Completed 2025-11-20)
- [x] Phase 5: Dashboard UI (Completed 2025-11-20)
- [ ] Phase 6: Polish

---

## Phase 1 Completion Notes

**Completed**: 2025-11-20

**Files created**:
- Docker setup (Dockerfile, docker-compose.yml)
- Next.js 14 with TypeScript, Tailwind (dark mode default)
- Jest + React Testing Library configured
- Prisma schema with Bank, Transaction, Rule, Category models

**To start**: `cd PBN_Frontend && docker-compose up --build`

---

## Phase 2 Completion Notes

**Completed**: 2025-11-20

**Files created**:
- `src/lib/auth.ts` - NextAuth config with Azure AD provider
- `src/app/api/auth/[...nextauth]/route.ts` - Auth API route
- `src/components/Providers.tsx` - SessionProvider wrapper
- `src/components/SignInButton.tsx` - Microsoft sign-in button
- `src/components/SignOutButton.tsx` - Sign out button
- `src/__tests__/auth.test.ts` - Auth configuration tests

**Key features**:
- Azure AD OAuth with Mail.Read scope
- Access token stored in session for Graph API calls
- Dark mode UI with sign in/out states

**User setup required**:
1. Register app in Azure Portal
2. Add Client ID and Secret to `.env.local`
3. Copy from `.env.example`

---

## Phase 3 Completion Notes

**Completed**: 2025-11-20

**Files created**:
- `src/lib/prisma.ts` - Prisma client singleton
- `src/lib/microsoft-graph.ts` - Graph API client for email fetching
- `src/app/api/banks/route.ts` - Bank CRUD (GET all, POST)
- `src/app/api/banks/[id]/route.ts` - Bank CRUD (GET one, PUT, DELETE)
- `src/app/api/sync/route.ts` - Email sync endpoint
- `src/app/banks/page.tsx` - Banks management UI
- `src/__tests__/banks.test.ts` - Bank CRUD tests
- `src/__tests__/microsoft-graph.test.ts` - Graph client tests

**Key features**:
- Full CRUD for banks (name, email filter, statement day, color)
- Microsoft Graph API integration to fetch emails
- Sync endpoint stores raw emails as transactions
- Banks management UI with add/edit/delete/sync

**Before testing Phase 3**:
```bash
docker-compose exec app npx prisma migrate dev --name init
docker-compose exec app npx prisma generate
```

---

## Phase 4 Completion Notes

**Completed**: 2025-11-20

**Files created**:
- `src/lib/parser.ts` - Email parser (amount, currency, merchant extraction)
- `src/lib/rules-engine.ts` - Classification rules engine
- `src/app/api/rules/route.ts` - Rules CRUD (GET all, POST)
- `src/app/api/rules/[id]/route.ts` - Rules CRUD (PUT, DELETE)
- `src/app/rules/page.tsx` - Rules management UI
- `src/__tests__/parser.test.ts` - Parser tests
- `src/__tests__/rules-engine.test.ts` - Rules engine tests

**Key features**:
- Parser extracts amount, currency (IDR/USD/CNY/etc), merchant from email
- Rules engine with conditions: contains, startsWith, endsWith, equals
- Priority-based rule matching
- Sync now auto-parses and categorizes transactions
- Rules management UI at /rules

---

## Phase 5 Completion Notes

**Completed**: 2025-11-20

**Files created**:
- `src/lib/billing-cycle.ts` - Billing period calculation, currency formatting
- `src/app/api/transactions/route.ts` - Get transactions with chart data
- `src/app/dashboard/page.tsx` - Main dashboard with chart and table

**Key features**:
- Bank selector dropdown
- Billing period navigator (← October 2024 →)
- Donut chart showing IDR spending by category
- Transaction table (newest first)
- Responsive layout: side-by-side on desktop, stacked on mobile
- 30/70 split between chart and table
