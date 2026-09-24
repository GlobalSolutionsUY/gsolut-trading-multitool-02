# Project Manifest & Architecture Checklist

This document is the **single source of truth** for core technologies, versions, architectural boundaries, and operational rules in **`gsolut-trading-multitool-02`**. Always consult this checklist before adding code, dependencies, or tools.

---

## 1. Technology Stack & Fixed Versions

| Layer | Tool / Technology | Version | Key Directives |
| :--- | :--- | :--- | :--- |
| **Language** | **TypeScript** | **`^7.0.2`** | Strict mode, NodeNext / Bundler modules, uniform across monorepo. |
| **Runtime** | **Node.js** | **`>= 20.0.0`** (Active: `v24.12.0`) | Standard library first (`fetch`, `node:crypto`, `node:test`). |
| **Package Manager** | **pnpm** | **`>= 9.0.0`** (Active: `v12.3.4`) | Workspaces (`pnpm-workspace.yaml`). |
| **Linter / Formatter** | **Biome** | **`1.9.4`** | Single Rust binary replacing ESLint + Prettier. Cross-platform LF line endings (`.gitattributes`). |
| **Backend API** | **Hono** | **`^4.6.14`** | `@hono/node-server`, route chaining for `AppType` inference, `app.request()` testing. |
| **Frontend Web** | **React + Vite** | **`React 18.3` + `Vite 6`** | Clean SPA dashboard, SVG/Canvas charting, typed RPC consumption. |
| **Automation** | **GNU Make** | Cross-platform | Universal commands (`make install`, `make check`, `make typecheck`, `make test`). |

---

## 2. Core Domain Concept & Golden Rules

1. **Copilot, NOT an Auto-Bot**:
   - The system is a **market intelligence radar and decision assistant**.
   - Humans (**Ger & Freya**) make 100% of the execution decisions.
   - The pipeline: $\text{Scan} \to \text{Detect} \to \text{Risk Filter} \to \text{Rank} \to \text{Alert} \to \mathbf{\text{Human Decision}}$.
2. **Never Force Trades**:
   - If market conditions do not present clear anomalies, output **0 opportunities**.
   - Do not trigger alerts just for activity.
3. **Decoupled Architecture**:
   - Pure domain packages (`connector-binance`, `radar-spot`, `risk-filter`, `alerter-telegram`) are **independent ES modules** inside `packages/`.
   - **Zero dependency on Hono or HTTP servers** in domain packages.
4. **Deterministic Mathematical Engine**:
   - Pure rule-based algorithms (RSI, SMA volume anomaly, rejection wicks, structure recovery).
   - **NO blackbox predictive AI models**.

---

## 3. Strict Anti-Scope (What NOT to Build / Ponytail Rules)

- ❌ **NO OpenAPI / Swagger bloat**: Keep contracts simple with native TypeScript interfaces.
- ❌ **NO autonomous order execution**: The system never places live trades or manages balances.
- ❌ **NO real money / exchange private API keys**: Ingestion uses public market data only.
- ❌ **NO unnecessary abstractions**: Apply the Ponytail Ladder (YAGNI, stdlib first, minimal code).
- ❌ **NO AI visual slop**: Purpose-driven, high-contrast, accessible UI.

---

## 4. Monorepo Structural Map

```text
gsolut-trading-multitool-02/
├── .agents/                    # Agent instructions, skills & rules (Workflow, Ponytail, Anti-Slop, Hono)
├── apps/
│   ├── spot-radar/             # [Planned] Background scanner daemon & Telegram runner (standalone CLI)
│   ├── api/                    # [Current] Read-only telemetry Hono HTTP server (serves /health, /api/status)
│   └── web/                    # [Current] React + Vite copilot dashboard (health badge, charting test)
├── packages/
│   ├── tsconfig/               # Shared TS configs (base.json, node.json, react.json)
│   ├── types/                  # Universal domain contracts (Candle, Ticker, Setup, Risk, Alert, Connector)
│   ├── logger/                 # Zero-dependency structured JSON logger
│   ├── connector-core/         # [Planned] Abstract exchange connector interface
│   ├── connector-binance/      # [Planned] Binance public REST client
│   ├── radar-spot/             # [Planned] Spot rebound mathematical detector
│   ├── risk-filter/            # [Planned] Risk classification & rationale engine
│   └── alerter-telegram/       # [Planned] Structured Telegram alert dispatcher
├── scripts/                    # Cross-platform development scripts (Node.js)
├── docs/                       # Architecture docs, ADRs, workflow guides
├── Makefile                    # Developer CLI commands
├── pnpm-workspace.yaml         # Workspace configuration
├── package.json                # Root orchestration & shared scripts
├── biome.json                  # Biome linter & formatter configuration
├── tsconfig.base.json          # Root TypeScript configuration
└── AGENTS.md                   # AI agent manifest
```

---

## 5. Git & Workflow Standards

- **Task Tracking**: All issues tracked in GitHub Projects ([Board #1](https://github.com/orgs/GlobalSolutionsUY/projects/1)).
- **Branch Lifecycle**:
  - Create dedicated branch: `feat/<issue-id>-<slug>` or `docs/<issue-id>-<slug>`.
  - Open Pull Request on GitHub.
  - Merge into `main` after verification.
  - **Preserve local branches** for historical traceability.
- **Commit Format (Mandatory)**:
  ```text
  <type>(<scope>): <summary> [refs #<issue-id>]

  - Concern: <module/layer>
  - Subissue/Item: <item reference>
  - Step: <Step X/Y: action description>
  ```
- **Explicit Concern Boundaries**:
  1. `project config / definition`: Root configs, workspace definition, biome, tsconfig, manifest.
  2. `infra / docker / ci-cd`: Dockerfiles, compose, GitHub Actions, deployment automation.
  3. `frontend framework / project`: apps/web setup, vite.config.ts, HTML shell, entrypoint.
  4. `frontend component / store / ui element`: UI components, charts, state stores, styling.
  5. `backend framework / project / base`: apps/api setup, server entrypoint, global middleware, health routes.
  6. `backend module features`: Standalone domain packages (connector, radar, risk, telegram) grouped with their corresponding server routes/controllers.
