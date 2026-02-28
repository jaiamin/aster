# Aster

Real-time geospatial data visualization platform. Track flights, ships, earthquakes, storms, and 11 other live data layers on a single interactive globe.

![Aster Screenshot](docs/screenshot.png)

## Features

- **15 live data layers** — flights, ships, earthquakes, volcanoes, wildfires, storms, satellites, air quality, buoys, launches, airports, ports, submarine cables, power plants, nuclear facilities
- **Real-time updates** — polled data with configurable intervals per layer
- **Interactive globe** — Deck.gl + Maplibre GL with clustering, filtering, and search
- **Data explorer** — virtualized table with range, enum, and boolean filters per layer
- **Dark/light mode** — full theme support with URL-persisted state

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4 |
| Mapping | Maplibre GL 5, Deck.gl 9 |
| Backend | Python 3.13, FastAPI, httpx |
| Cache | Redis 7 (with in-memory fallback) |
| Infra | Docker Compose, Nginx, Turborepo |

## Quick Start

### Docker (recommended)

```bash
cp apps/api/.env.example apps/api/.env
# Fill in API keys (see apps/api/.env.example for details)

docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

### Local Development

**Prerequisites:** Node.js 24+, pnpm, Python 3.13+, uv, Redis (optional)

```bash
# Install dependencies
pnpm install

# Set up backend
cp apps/api/.env.example apps/api/.env
# Fill in API keys

# Start everything (web + api via Turborepo)
pnpm dev
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:8000/api](http://localhost:8000/api)

## Architecture

```
aster/
├── apps/
│   ├── web/           # React SPA (Vite + Tailwind)
│   │   └── src/
│   │       ├── modules/   # One directory per data layer
│   │       ├── hooks/     # Shared data-fetching hooks
│   │       └── components/# Globe, shell, detail cards
│   └── api/           # FastAPI service
│       └── app/
│           ├── routers/   # One file per data layer endpoint
│           ├── services/  # Business logic + external API calls
│           └── cache.py   # Redis wrapper with in-memory fallback
├── packages/          # Shared packages (future)
└── docs/              # Architecture & contributor guides
```

Each data layer is a self-contained module on both frontend and backend. See [Adding a Module](docs/adding-a-module.md) for the full guide.

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

## License

[MIT](LICENSE)
