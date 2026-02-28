# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**af-db-ts** — TypeScript library providing database utility functions for two SQL dialects: Microsoft SQL Server (`mssql`) and PostgreSQL (`pg`). Published to npm with triple-format output (CJS, ESM, type declarations). Handles connection pool management, SQL value preparation/escaping, schema introspection with caching, SQL generation (INSERT/UPDATE/MERGE/UPSERT), and TypeScript interface codegen from live database schemas.

## Build & Development Commands

```bash
npm run build        # tsc -b on 3 tsconfigs (CJS + ESM + types)
npm run cb           # clean + build
npm run clean        # rm -rf dist/*
npm run lint         # eslint .ts files
npm run lint:fix     # eslint --fix
npm run test         # jest (requires live DB connections)
npm run release      # lint:fix → clean → build → test
```

**Tests require live database connections** configured in `config/test.yaml` (loaded when `NODE_ENV=test`). Test timeout is 100 seconds. Tests run in alphabetical order via a custom sequencer (`__tests__/test-sequencer.js`).

Run a single test file:
```bash
npx jest --config jest.config.js __tests__/db/pg/pg-prepare-sql-value.spec.ts
```

## Architecture

### Dual-Dialect Symmetry

The library mirrors its API across two dialects under `src/ms/` and `src/pg/`:

```
src/
├── index.ts              # Public API — re-exports everything
├── common.ts             # Shared: NULL constant, logSqlError, closeAllDb, graceExit
├── @types/               # All type definitions (I-prefix for interfaces, T-prefix for aliases)
├── utils/                # Shared utilities (datetime, numeric, array, schema formatting)
├── ms/                   # MSSQL dialect
│   ├── pool-ms.ts        # ConnectionPool cache (poolsCacheMs), getPoolConnectionMs
│   ├── query-ms.ts       # queryMs()
│   ├── prepare-value.ts  # prepareSqlValueMs — type-dispatch value→SQL conversion
│   ├── table-schema-ms.ts# getTableSchemaMs — INFORMATION_SCHEMA introspection, cached
│   ├── get-sql/          # SQL generators: insert.ts, update.ts, merge.ts
│   └── ...
└── pg/                   # PostgreSQL dialect (mirrors ms/ structure)
    ├── pool-pg.ts        # Pool cache (poolsCachePg), getPoolPg
    ├── query-pg.ts       # queryPg()
    ├── prepare-value.ts  # prepareSqlValuePg — type-dispatch value→SQL conversion
    ├── table-schema-pg.ts# getTableSchemaPg — introspection, cached
    ├── insert-pg.ts      # insertPg() — smart upsert with EUpdateLevel
    ├── get-sql/          # SQL generators: insert.ts, update.ts, merge.ts, reset-sequence.ts
    └── ...
```

### Key Patterns

- **Module-level caches**: Pool connections (`poolsCacheMs`, `poolsCachePg`) and table schemas (`tableSchemaHash`) are cached in module-scope objects. Stateful across calls within the same process.
- **Type dispatch via `switch(dataType)`** in `prepareSqlValueMs/Pg` — maps SQL column types to appropriate JS→SQL conversions.
- **Argument objects** for multi-parameter functions: `getInsertSqlPg(arg)`, `getMergeSqlPg(arg)`, `insertPg({...})`.
- **Graceful degradation**: Most functions return `undefined`/`null` on failure rather than throwing. Optional `throwError` flag enables throwing.
- **Dual argument signatures**: `queryPg(string | IQueryPgArgs, ...)`, `getPoolPg(string | object)`.
- **SQL quoting**: MS uses `[schema].[table]`, PG uses `"schema"."table"`. The `schemaTable.to.ms/pg()` utility handles formatting.
- **PG dollar-quoting**: `quoteStringPg()` uses `$s$...$s$` for strings containing single quotes or backslashes.

### Configuration

Uses `node-config` library. Supports two config schemas:
- **Current**: `cfg.db.mssql.dbs` / `cfg.db.postgres.dbs` with `options` sibling
- **Legacy**: `cfg.database` (flat structure)

Config files: `config/default.yaml`, `config/test.yaml` (activated by `NODE_ENV=test`).

### `insertPg` and EUpdateLevel

The `insertPg()` function implements smart upsert behavior controlled by `EUpdateLevel`:
- `NEVER_UPDATE` (0) — find existing by identity, insert only if not found (ON CONFLICT DO NOTHING)
- `UPDATE_IF_NOT_FOUND` (1) — find existing, insert + update if not found
- `UPDATE_ALWAYS` (2) — always upsert (ON CONFLICT DO UPDATE SET)

Identity resolution order: primary key → serial fields → unique constraints.

### Naming Conventions

- Functions: `camelCase`, suffixed by dialect — `queryMs`, `queryPg`, `getInsertSqlMs`
- Interfaces: `I` prefix — `IFieldDefMs`, `ITableSchemaPg`
- Type aliases: `T` prefix — `TDBRecord`, `TDataTypePg`
- Enums: `E` prefix — `EUpdateLevel`
- Constants: `SCREAMING_SNAKE_CASE`
- Inline comments may be in Russian

### Dependencies (af-* ecosystem)

This library depends on several `af-*` packages by the same author:
- `af-tools-ts` — utilities: `cloneDeep`, `sleep`, `each`, `getBool`, `rn`, `omitBy`, `Debug`
- `af-echo-ts` — structured console output: `echo.error`, `echo.info`, `echo.g`
- `af-color` — terminal color codes

### Build Output

Published to npm with `dist/cjs/`, `dist/esm/`, `dist/types/`, and `src/` (raw TS sources).
