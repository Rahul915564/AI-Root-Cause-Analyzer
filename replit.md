# AI Root Cause Analyzer

## Overview

A production-ready AI Root Cause Analyzer web app for Software/IT engineers. Dark-themed, rule-based analysis engine with history tracking, PDF export, and Hindi/English language toggle.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/rca-app) at path `/`
- **API framework**: Express 5 (artifacts/api-server) at path `/api`
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Charts**: Recharts
- **Build**: esbuild (CJS bundle)

## Features

1. **Input options**: paste logs/stack traces, upload .txt/.log files, or type errors manually
2. **AI Analysis**: rule-based pattern matching for 15+ error types with confidence scores
3. **Solution suggestions**: top 3 fixes with code snippets + Stack Overflow links
4. **History dashboard**: last 10 analyses, filter by error type, delete, PDF export (window.print)
5. **Stats page**: total analyses, avg confidence, critical count, bar chart breakdown
6. **Hindi/English toggle** via LanguageContext
7. **Dark mode by default** (deep slate + electric cyan theme)

## Error Types Supported

- JavaScript: TypeError, ReferenceError, SyntaxError
- Java: NullPointerException, OutOfMemoryError
- Python: AttributeError, ImportError, KeyError
- Node.js: UnhandledPromiseRejection, heap out of memory
- Database: PostgreSQL/MySQL/MongoDB connection errors
- API: 404, 500, CORS errors
- System: CPU/timeout/socket errors

## Key Files

- `artifacts/rca-app/src/pages/analyzer.tsx` — main analysis page
- `artifacts/rca-app/src/pages/history.tsx` — history dashboard
- `artifacts/rca-app/src/pages/stats.tsx` — stats/charts page
- `artifacts/rca-app/src/hooks/use-language.tsx` — Hindi/English i18n
- `artifacts/api-server/src/lib/analyzer.ts` — rule-based analysis engine
- `artifacts/api-server/src/routes/analyze.ts` — all API routes
- `lib/db/src/schema/analyses.ts` — database schema
- `lib/api-spec/openapi.yaml` — OpenAPI contract

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
