# Adding a New Data Module

This guide walks through adding a new data layer to Aster, from backend API to map visualization.

## 1. Backend: Add the Router

Create `apps/api/app/routers/<layer>.py`:

```python
from fastapi import APIRouter

from app.services.base import fetch_and_cache

router = APIRouter()

API_URL = "https://api.example.com/data"
CACHE_KEY = "my_layer"
TTL = 300  # seconds


def _transform(resp):
    """Transform API response into frontend-friendly format."""
    data = resp.json()
    return [
        {
            "id": item["id"],
            "latitude": item["lat"],
            "longitude": item["lon"],
            # ... map fields to your schema
        }
        for item in data
        if item.get("lat") is not None
    ]


@router.get("/my-layer")
async def get_my_layer():
    return await fetch_and_cache(CACHE_KEY, API_URL, TTL, _transform, error_source="MyAPI")
```

## 2. Backend: Register the Router

In `apps/api/app/main.py`, add:

```python
from app.routers import my_layer

app.include_router(my_layer.router, prefix="/api")
```

## 3. Backend: Add to Scheduler (Optional)

If your data updates frequently, add a refresh entry in `apps/api/app/scheduler.py`:

```python
def _build_schedule():
    from app.routers.my_layer import _transform

    return [
        # ... existing entries ...
        ("my_layer", lambda: refresh("my_layer", API_URL, TTL, _transform), 300, 45),
    ]
```

The tuple is: `(name, refresh_fn, interval_seconds, stagger_offset_seconds)`.

## 4. Frontend: Define Types

Create `apps/web/src/types/my-layer.ts`:

```typescript
export interface MyLayerItem {
  id: string;
  latitude: number;
  longitude: number;
  // ... your fields
}
```

## 5. Frontend: Create the Module

Create the module directory `apps/web/src/modules/my-layer/`:

### `use-my-layer.ts` — Data hook

```typescript
import { usePolledData } from "@/hooks/use-polled-data";
import type { MyLayerItem } from "@/types/my-layer";

export function useMyLayer() {
  const { data } = usePolledData<MyLayerItem[]>({
    endpoint: "/api/my-layer",
    interval: 300_000, // match your backend TTL
  });
  return data;
}
```

### `my-layer-context.tsx` — Selection state

```typescript
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface Selection {
  item: MyLayerItem;
}

const Ctx = createContext<{
  selected: Selection | null;
  select: (item: MyLayerItem) => void;
  deselect: () => void;
}>({ selected: null, select: () => {}, deselect: () => {} });

export function MyLayerSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Selection | null>(null);
  const select = useCallback((item: MyLayerItem) => setSelected({ item }), []);
  const deselect = useCallback(() => setSelected(null), []);
  return <Ctx.Provider value={{ selected, select, deselect }}>{children}</Ctx.Provider>;
}

export function useMyLayerSelection() {
  return useContext(Ctx);
}
```

### `my-layer-layer.tsx` — Map layer

Follow the pattern in `earthquakes-layer.tsx`:

1. Call your data hook
2. Apply time and explorer filters
3. Register module count and region count
4. Convert to GeoJSON
5. Render with `<ClusteredPinSource>`

### `my-layer-detail-card.tsx` — Detail popup

Render selected item details in a card component.

## 6. Frontend: Register the Module

In `apps/web/src/modules/registry.ts`, add your module:

```typescript
{
  id: "my-layer",
  label: "My Layer",
  icon: YourIcon,           // from lucide-react
  category: "Infrastructure", // or Events, Maritime, etc.
  layer: lazy(() => import("./my-layer/my-layer-layer")),
  columns: [
    { key: "id", label: "ID" },
    // ... explorer table columns
  ],
}
```

## 7. Add Tests

### Backend test: `apps/api/tests/test_my_layer.py`

```python
import httpx
import json
import pytest
from app.routers.my_layer import _transform


class TestMyLayerTransform:
    def _make_response(self, data):
        return httpx.Response(
            status_code=200,
            request=httpx.Request("GET", "https://test.example.com"),
            content=json.dumps(data).encode(),
        )

    def test_transforms_valid_data(self):
        result = _transform(self._make_response([...]))
        assert len(result) == 1
        assert result[0]["id"] == "expected"
```

### Run tests

```bash
# Backend
cd apps/api && uv run pytest -v

# Frontend
pnpm --filter web test
```

## Checklist

- [ ] Backend router with `_transform()` function
- [ ] Router registered in `main.py`
- [ ] Scheduler entry added (if data updates frequently)
- [ ] TypeScript types defined
- [ ] Data hook (`use-my-layer.ts`)
- [ ] Selection context
- [ ] Map layer component
- [ ] Detail card component
- [ ] Module registered in `registry.ts`
- [ ] Backend transform test
- [ ] Manual verification: endpoint returns data, layer renders on map
