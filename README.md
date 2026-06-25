# School Sync Manager 🇺🇬

> Uganda School Management System — TypeScript monorepo with offline-first sync, Zod validation, and React Hook Form.

## Architecture

```
school-sync-manager/
├── tsconfig.base.json          # Strict TS + workspace path aliases
├── package.json                # Turborepo workspaces
├── apps/
│   └── web/
│       └── src/
│           ├── providers/
│           │   └── SyncProvider.tsx      # useSyncManager() hook
│           ├── components/
│           │   ├── ui/
│           │   │   ├── Combobox.tsx      # Searchable Ugandan districts
│           │   │   ├── CurrencyCard.tsx  # formatUGX() dashboard cards
│           │   │   └── SyncStatusBar.tsx # Online/offline indicator
│           │   └── forms/
│           │       └── SchoolSettingsForm.tsx  # RHF + Zod
│           ├── hooks/__mocks__/
│           │   └── useSyncManager.ts    # Vitest mock
│           └── __tests__/
│               ├── utils.test.ts
│               └── validation.test.ts
└── lib/
    ├── shared/validation/index.ts  # Zod schemas + 135 Ugandan districts
    ├── utils/index.ts              # formatUGX, formatUGXRaw, phone utils
    ├── db/index.ts                 # IndexedDB offline mutation queue
    └── sync/index.ts               # SyncManager (pure class, no React)
```

## Key Features

- **Offline-first**: mutations queue in IndexedDB, auto-flush on reconnect
- **Ugandan districts**: all 135 districts as a Zod enum + searchable combobox
- **Phone validation**: MTN (077/079), Airtel (070/078), Africell (075)
- **Currency**: `formatUGX(5000000)` → `UGX 5M` in cards; raw integers in forms
- **Strict TypeScript**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Test-ready**: Vitest mocks + unit tests for utils and validation

## Getting Started

```bash
npm install
npm run dev
```

## Running Tests

```bash
npm run test
```

## Tech Stack

- TypeScript 5.4 (strict)
- React 18 + React Hook Form
- Zod
- IndexedDB (offline queue)
- Vitest
- Turborepo