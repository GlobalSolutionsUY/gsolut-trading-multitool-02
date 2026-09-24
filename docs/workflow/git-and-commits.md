# Engineering Workflow & Commit Guidelines

## 1. Branch & Pull Request Strategy
- **`main`**: Protected branch, always passing tests and builds.
- **Goal Branches**: For large milestones or tasks, branch from `main`:
  ```bash
  git checkout -b feat/<issue-id>-<slug>
  ```
- **Pull Requests**:
  - Open a PR on GitHub with clear summary and issue reference (`Closes #<id>` or `Refs #<id>`).
  - Merge into `main` after verification.
  - **Retain local branch** for historical reference and inspection.

---

## 2. Commit Message Standards

Commits must be **atomic** and strictly **grouped by concern, subissue, item, and step**.

### Format:
```text
<type>(<scope>): <concise imperative title> [refs #<issue-id>]

- Concern: <module or layer: Tooling / Architecture / Types / Engine / Risk / Telegram>
- Subissue/Item: <Item name or milestone reference>
- Step: <Step X/Y: action performed in this step>

<Optional details: rationale, edge case handling, or ponytail comments>
```

### Allowed Types:
- `feat`: New feature or module
- `fix`: Bug fix
- `refactor`: Structural changes without changing external behavior
- `perf`: Performance improvements
- `test`: Adding or updating test suites
- `build`: Build system, pnpm configs, workspace tooling
- `ci`: CI configuration and scripts
- `docs`: Documentation additions and updates
- `chore`: Maintenance and configuration adjustments
