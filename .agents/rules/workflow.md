# Workflow & Project Management Rules

This document establishes the mandatory workflow, version control, task tracking, and commit standards for **gsolut-trading-multitool-02**.

---

## 1. Task Hierarchy & GitHub Project Tracking

1. **Epic & Issue Alignment**:
   - All work must be tracked in GitHub Projects ([Board #1](https://github.com/orgs/GlobalSolutionsUY/projects/1)) under repository [gsolut-trading-multitool-02](https://github.com/GlobalSolutionsUY/gsolut-trading-multitool-02).
   - For every distinct goal or work session, create a tracked Issue/sub-issue assigned to `@me` and associated with the project.

2. **In-Progress Status**:
   - Immediately transition the issue to `In Progress` upon starting.
   - Do not keep tasks in `Todo` once analysis, coding, or documentation has begun.

---

## 2. Branching & PR Strategy

1. **Dedicated Goal Branch**:
   - For large goals or milestones, create a dedicated branch from `main`:
     - `feat/<issue-id>-<slug>`
     - `fix/<issue-id>-<slug>`
     - `docs/<issue-id>-<slug>`
     - `refactor/<issue-id>-<slug>`
2. **Open PR & Merge**:
   - Open a clear, structured Pull Request linking the issue (`Closes #<id>` or `Refs #<id>`).
   - Merge the PR into `main` upon review/validation.
3. **Preserve Local Branches**:
   - **Keep the local branch** after merging to `main` for reference and historical traceability.

---

## 3. Commit Standards (Grouped by Concern, Subissue, Item, Step)

Commits must be **atomic** and strictly **grouped by concern, subissue, item, and step**. Never mix formatting/tooling changes with domain logic, or tests with unrelated features.

### Message Format:
```text
<type>(<scope>): <concise imperative summary> [refs #<issue-id>]

- Concern: <module/layer being touched (e.g. Architecture / Ingestion / Tooling / Core / Alerter)>
- Subissue/Item: <specific item or milestone reference>
- Step: <Step X/Y: brief description of step>

<Optional details: rationale, edge cases, or ponytail notes>
```

### Allowed Types:
- `feat`: New feature or capability
- `fix`: Bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `build`: Build system, package configs, workspace tooling
- `ci`: CI workflows, GitHub Actions
- `docs`: Documentation updates
- `chore`: Maintenance, repository setup, configuration

---

## 4. Engineering Standards & Directives

1. **Uniform Language (Node.js & TypeScript)**:
   - TypeScript is the sole language across apps, packages, and tooling.
   - Strict TS compiler configurations.
2. **Fast & Clean Tooling (Biome + pnpm)**:
   - Package manager: `pnpm` workspaces.
   - Linter & Formatter: `biome` (Rust-based, zero-overhead, replaces ESLint + Prettier).
3. **Cross-Platform Execution**:
   - Root `Makefile` and pnpm scripts must run cleanly on both Windows (PowerShell/pwsh) and Unix (sh/bash).
4. **Ponytail (Simplicity & YAGNI)**:
   - Follow `.agents/rules/ponytail.md`. Solve problems with minimal code; standard library first; no speculative abstractions.
5. **Anti-Slop**:
   - Follow `.agents/rules/antislop.md`. No AI visual fluff, purpose-driven UI, meaningful code comments.
