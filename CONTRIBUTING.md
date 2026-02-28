# Contributing to Aster

Thanks for your interest in contributing! This guide will help you get set up and submit your first PR.

## Development Setup

### Prerequisites

- Node.js 24+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- Python 3.13+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Redis (optional — falls back to in-memory cache)

### Install & Run

```bash
git clone https://github.com/your-org/aster.git
cd aster
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev
```

### Project Structure

- `apps/web/` — React SPA with Vite, Tailwind, Maplibre GL, Deck.gl
- `apps/api/` — FastAPI service with httpx for external APIs, Redis for caching
- `packages/` — Shared packages (types, connectors, etc.)
- Each data layer is a **module** with matching web + api components

## Branch Naming

```
feat/short-description    # New feature
fix/short-description     # Bug fix
docs/short-description    # Documentation
refactor/short-description # Refactoring
```

## Commit Conventions

Write clear, imperative commit messages:

```
Add earthquake magnitude filter
Fix flight track endpoint timeout
Update storm layer clustering logic
```

## Pull Request Process

1. Fork the repo and create a branch from `main`
2. Make your changes with clear, focused commits
3. Ensure `pnpm lint` and `pnpm build` pass
4. Run `pnpm test` if tests exist for your area
5. Fill out the PR template completely
6. Request review

## Adding a New Data Layer

See [docs/adding-a-module.md](docs/adding-a-module.md) for the step-by-step guide.

## Code Style

- **Frontend:** ESLint + Prettier (auto-enforced by pre-commit hooks)
- **Backend:** Ruff linter + formatter (auto-enforced by pre-commit hooks)
- Hooks run automatically on commit via Husky + lint-staged

## Reporting Issues

Use the GitHub issue templates for [bug reports](.github/ISSUE_TEMPLATE/bug_report.yml) and [feature requests](.github/ISSUE_TEMPLATE/feature_request.yml).

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be kind and respectful.
