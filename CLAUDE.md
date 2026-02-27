# Aster

Geospatial data visualization platform — real-time global data on a 3D globe.

## Stack

- **Frontend:** React 19, TypeScript, Vite, MapLibre GL + Deck.gl, Tailwind CSS 4, shadcn/ui
- **Backend:** Python 3.13, FastAPI, uv package manager
- **Monorepo:** npm workspaces (root installs everything), concurrently for dev

## Dev Commands

```bash
npm install          # Install all dependencies (root + frontend)
npm run dev          # Start both frontend (5173) and backend (8000)
npm run dev:frontend # Frontend only
npm run dev:backend  # Backend only
```

## Project Structure

```
frontend/src/
  components/globe/   # Map rendering (MapLibre + Deck.gl layers)
  components/shell/   # App layout, sidebar, panels
  components/hud/     # Heads-up display overlays
  modules/            # Feature modules (flights, ships, earthquakes, etc.)
  hooks/              # Custom React hooks
  types/              # TypeScript type definitions
  lib/                # Utilities

backend/app/
  main.py             # FastAPI app + router registration
  config.py           # Pydantic settings (.env loading)
  routers/            # One file per data source (flights, ships, etc.)
```

## Conventions

- Frontend path alias: `@/` maps to `frontend/src/`
- All API routes prefixed with `/api`
- Vite proxies `/api` to backend at `localhost:8000`
- One router file per data source in `backend/app/routers/`
- One type file per data source in `frontend/src/types/`
- shadcn/ui style: `new-york`, base color: `zinc`
- Environment variables go in `backend/.env` (see `backend/.env.example`)
