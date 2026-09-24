# Trading Multitool 02 (Radar & Copilot)

[![Philosophy](https://img.shields.io/badge/Philosophy-Ponytail%20%7C%20Anti--Slop-success.svg)](.agents/)
[![Language](https://img.shields.io/badge/Language-TypeScript%205.7-blue.svg)](packages/tsconfig)
[![Tooling](https://img.shields.io/badge/Linter%20%26%20Formatter-Biome%201.9-yellow.svg)](biome.json)
[![Package Manager](https://img.shields.io/badge/Package%20Manager-pnpm%2012-orange.svg)](pnpm-workspace.yaml)

> **Modular market intelligence radar and tactical copilot for human-in-the-loop decision makers.**
> The system crunches high-throughput market data to surface real anomalies; humans (**Ger & Freya**) retain 100% execution authority.

---

## Core Philosophy

1. **Copilot, NOT an Auto-Bot**: The system never executes autonomous trades or exposes capital directly. It filters market noise, calculates risk-adjusted setups, and sends structured alerts for human execution.
2. **Never Force Trades**: If conditions fail quality and risk thresholds, the copilot reports zero opportunities rather than generating low-conviction noise.
3. **Decoupled Architecture**: Exchange-agnostic design. Binance is the initial read connector; future platforms (Bitunix, Bitget, Trading Different) plug directly into standard connector interfaces.
4. **Deterministic Rules Engine**: Pure mathematics, indicators, and structure recovery heuristics. No blackbox price-prediction models.
5. **Ponytail & Anti-Slop**: Radical simplicity (YAGNI), zero-overhead tooling, and intentional, purposeful design.

---

## Repository Layout

```text
gsolut-trading-multitool-02/
├── .agents/                    # Agent instructions, skills & rules (Ponytail, Anti-Slop, Workflow)
├── apps/                       # Applications & daemons
│   └── (spot-radar, api, web)
├── packages/                   # Shared libraries & domain modules
│   ├── tsconfig/               # Shared TS configs (base, node, react)
│   ├── types/                  # Canonical domain types & connector interfaces
│   └── logger/                 # Zero-dependency structured JSON logger
├── scripts/                    # Cross-platform development scripts (Node.js)
├── docs/                       # Architecture diagrams, ADRs, workflow guides
├── Makefile                    # Cross-platform Make entrypoints (Windows/Unix)
├── pnpm-workspace.yaml         # Workspace configuration
├── package.json                # Root orchestration & scripts
├── biome.json                  # Ultra-fast linter & formatter
└── AGENTS.md                   # AI agent directives manifest
```

---

## Quickstart

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **pnpm**: `>= 9.0.0` (pnpm 12 supported)
- **Make**: Available on Windows (`pwsh` / Git Bash) and Linux/macOS

### Commands

```bash
# 1. Install workspace dependencies
make install

# 2. Check formatting, linting, and imports
make check

# 3. Typecheck all packages
make typecheck

# 4. Clean build artifacts
make clean
```

---

## Agent & Contributor Directives
- **Workflow & PR Rules**: [.agents/rules/workflow.md](.agents/rules/workflow.md)
- **Ponytail Ladder**: [.agents/rules/ponytail.md](.agents/rules/ponytail.md)
- **Anti-Slop Standards**: [.agents/rules/antislop.md](.agents/rules/antislop.md)
- **Agent Entrypoint**: [AGENTS.md](AGENTS.md)
