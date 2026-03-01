# Aster Strategy: Mission Control for Earth

> Brutally honest product and market analysis — March 2026

---

## Table of Contents

1. [Where Aster Stands Today](#1-where-aster-stands-today)
2. [The Competitive Landscape](#2-the-competitive-landscape)
3. [The World Monitor Problem](#3-the-world-monitor-problem)
4. [Prediction Markets as Intelligence](#4-prediction-markets-as-intelligence)
5. [Available Data Sources & APIs](#5-available-data-sources--apis)
6. [The MCP Question: Does This Beat an AI with Tools?](#6-the-mcp-question-does-this-beat-an-ai-with-tools)
7. [What Actually Creates Value](#7-what-actually-creates-value)
8. [Three Strategic Paths](#8-three-strategic-paths)
9. [Recommended Path: The Intelligent Globe](#9-recommended-path-the-intelligent-globe)
10. [What to Build Next](#10-what-to-build-next)
11. [What to Avoid](#11-what-to-avoid)
12. [Sources](#12-sources)

---

## 1. Where Aster Stands Today

~5,000 lines of application code across a well-architected monorepo:

- **Frontend**: React 19 + TypeScript + MapLibre GL + deck.gl on a 3D globe
- **Backend**: FastAPI + Redis caching + async scheduler
- **15 live data layers**: flights, ships, earthquakes, wildfires, volcanoes, storms, satellites, airports, ports, submarine cables, power plants, nuclear facilities, buoys, air quality, launches
- **Solid engineering**: modular architecture, code splitting, clustering, grid sampling, React Scan profiling, Docker compose, CI/CD, pre-commit hooks

**Maturity**: Early-stage with a solid foundation. The architecture is clean, the module pattern is repeatable, and the data pipeline (background scheduler → Redis cache → polling frontend) is production-ready. But there's no database, no auth, no alerting, no analytics, and no AI integration yet.

**The honest assessment**: Aster is a well-built real-time data aggregation viewer. It renders 15 data layers on a globe. So does World Monitor — with 80+ data layers, AI threat classification, and 18,000 GitHub stars.

---

## 2. The Competitive Landscape

### Open Source — Direct Competitors

| Platform | Stars | Layers | AI | Key Differentiator |
|----------|-------|--------|----|--------------------|
| **World Monitor** | 18.2k | 80+ | Yes (Ollama/Groq fallback chain, threat classification, bias detection) | Most comprehensive free global monitor. Works with zero API keys. Viral traction. |
| **GlobalThreatMap** | New | ACLED + news | Yes (Valyu API, 50-page Intel Dossiers) | AI-generated intelligence reports, CSV/PPTX exports |
| **Monitor the Situation** | — | Flights, stocks, news, OSINT | No | Ops-center aesthetic, curated layout |
| **Glint** | — | News + prediction markets | No | Global tension index from prediction markets |
| **Aster** | — | 15 | No | Clean architecture, modular, but fewer features |

### Open Source — Building Blocks (Not Competitors, But Relevant)

| Project | Stars | What It Is |
|---------|-------|------------|
| CesiumJS | 14.8k | The foundational 3D globe library (powers NASA Eyes, Palantir) |
| deck.gl | 13k | High-performance data visualization renderer (used by Aster, World Monitor) |
| kepler.gl | 11k | Geospatial analysis tool for large datasets |
| NASA Open MCT | 12.6k | Mission operations telemetry framework |
| SpiderFoot | 16.7k | OSINT automation (200+ modules, cyber-focused) |
| TerriaJS | 1.3k | Spatial digital twin framework (powers Australia's NationalMap) |

### Commercial — The Real Competition

| Platform | Revenue/Valuation | What They Actually Sell |
|----------|-------------------|------------------------|
| **Palantir** | $250B+ market cap | Not visualization — the **Ontology** (semantic data model enabling operational workflows in classified environments) |
| **Dataminr** | ~$200M ARR | Real-time event detection: trillions of daily computations, 50+ proprietary LLMs, 1M+ sources, 150 languages. New: **Intel Agents** (agentic AI that autonomously investigates events) |
| **Recorded Future** | Acquired by Mastercard | Intelligence Graph: 200B+ data points, dark web monitoring, autonomous threat operations |
| **Seerist** | Enterprise | AI + 100 human analysts from Control Risks. Predictive threat forecasting |

### The Honest Gap Analysis

The value stack, in order of defensibility:

```
1. Workflow      (most defensible)  — What action does the user take?
2. Predictions   — What's going to happen next?
3. Intelligence  — How do different data sources relate?
4. Visualization — How do you see the data?
5. Aggregation   (least defensible) — Do you have the data?
```

**Aster currently operates at levels 4 and 5. So does World Monitor. Neither has a moat.**

Palantir's entire $250B valuation comes from levels 1-3. Dataminr's $200M ARR comes from levels 1-2. Nobody is paying for aggregation and visualization alone — those are commodities in 2026.

---

## 3. The World Monitor Problem

World Monitor is the elephant in the room. It:

- Has 18,200 GitHub stars and viral social media traction
- Tracks 80+ data sources (vs Aster's 15)
- Includes AI-powered threat classification with source bias detection
- Flags state-affiliated propaganda outlets
- Runs entirely in-browser with zero API keys as a baseline
- Has Polymarket prediction market integration already built
- Integrates GDELT, ACLED conflict data, military bases, naval vessels
- Supports local AI processing via Ollama for privacy

**Building "another World Monitor" is a losing strategy.** It has first-mover advantage, community momentum, and feature breadth. Competing on the same axis (more data layers on a globe) means fighting for attention in a space where someone is already winning — and giving it away for free.

**But World Monitor has real weaknesses:**

1. **No verification workflow** — it's an early warning system, not a decision-making system
2. **Single-developer origin** (bus factor risk)
3. **No persistent data / historical analysis** — everything is ephemeral
4. **No user-specific workflows** — same view for everyone
5. **Dashboard, not a tool** — you look at it, you don't work in it
6. **No collaboration** — single-user experience

These weaknesses point toward where the actual opportunity lies.

---

## 4. Prediction Markets as Intelligence

### What's Actually Available

| Market | API Quality | Real-time | Auth | Free Reads | Best For |
|--------|-------------|-----------|------|------------|----------|
| **Polymarket** | Excellent (REST + 2 WebSocket feeds) | Yes | Ed25519 for trading, none for reads | Yes | High-liquidity geopolitical events. 191 new geopolitical markets in Jan 2026 alone. |
| **Kalshi** | Excellent (REST + WebSocket + FIX 4.4) | Yes | RSA-signed, 30-min token refresh | Yes (reads) | CFTC-regulated, USD-denominated. Institutional signal. |
| **Metaculus** | Moderate (OpenAPI spec) | No | Account-based | Yes | Long-term forecasts (AI timelines, existential risk). Complementary slow signal. |
| **Manifold** | Decent (REST, 500 req/min) | No | API key | Yes | Broadest market creation. Play money = weaker signal. |
| **PredictIt** | Minimal (1 endpoint, 1 req/min) | No | None | Yes | US politics only. Supplementary. |

### How Reliable Are Prediction Markets?

Academic research says: **genuinely useful, but not magic.**

- At 100+ days before elections, markets beat polls by nearly 2 percentage points on average
- Markets typically exceed expert forecasts and opinion polls
- Combined forecasts (polls + markets + models) reduce error by 16-59% vs any single method
- Corporate prediction markets (HP, Google) outperformed official company forecasts

**Critical caveats:**

- **Thin market problem**: Only elections get deep liquidity. A "Will Country X collapse?" market with $50K volume is noise, not signal. Always display volume/trader count alongside probability.
- **Manipulation is real**: People were indicted in Feb 2026 for using classified intelligence to trade on Polymarket. A single six-figure trade can move thin geopolitical markets.
- **Historical failures**: Markets badly missed Brexit and Trump 2016 due to herding behavior.
- **Insider trading as a feature**: Suspicious trading ahead of military operations means markets may be more accurate *because* informed actors are trading — but it's ethically murky.

**Bottom line**: Prediction markets are the best real-time probabilistic signal available for many event categories. But they must be displayed with context — volume as confidence indicator, trader count, triangulated against news and ACLED data. Never treat thin market probabilities as ground truth.

### Integration Priority

**Tier 1 — Integrate immediately** (free, high value, APIs ready):
- Polymarket (WebSocket for real-time, Gamma API for discovery)
- GDELT (15-minute global event feed, free, MCP server exists)
- ACLED (conflict events, free, Python library)

**Tier 2 — Integrate with some effort** (requires auth setup):
- Kalshi (WebSocket + REST, RSA auth)
- Metaculus (long-term forecasts)

**Tier 3 — Evaluate cost/benefit**:
- NewsAPI.ai / Event Registry (enriched news, paid)
- Twitter/X ($200/mo Basic is inadequate; $5K/mo Pro might work; consider GDELT as proxy)

---

## 5. Available Data Sources & APIs

### Already Integrated in Aster (15 layers)

Flights (OpenSky), Ships (AISStream WebSocket), Earthquakes (USGS), Wildfires (NASA FIRMS), Volcanoes (NASA EONET), Storms (NHC), Satellites (CelesTrak), Airports (FAA), Ports, Submarine Cables (TeleGeography), Power Plants, Nuclear Facilities (GeoNuclearData), Buoys (NOAA), Air Quality (OpenAQ), Launches (Space Devs)

### High-Value Sources NOT Yet Integrated

| Source | What It Provides | Cost | Update Frequency |
|--------|-----------------|------|-----------------|
| **GDELT** | Global events from broadcast/print/web in 100+ languages since 1979. 2,500+ themes, emotions, entities. | Free | 15 minutes |
| **ACLED** | Political violence and protest data globally. Dates, actors, locations, fatalities. Academic gold standard. | Free | Weekly (near real-time coded) |
| **Polymarket** | Prediction probabilities on geopolitics, elections, economics, climate, tech. | Free reads | Real-time WebSocket |
| **Kalshi** | CFTC-regulated prediction probabilities. USD-denominated. | Free reads | Real-time WebSocket |
| **Metaculus** | Long-term probabilistic forecasts on AI, existential risk, science. | Free | Periodic |
| **Open-Meteo** | High-resolution weather from multiple national services. Self-hostable. | Free | Varies by model |
| **GDELT GKG** | Global Knowledge Graph — persons, organizations, themes, emotions extracted from news. | Free | 15 minutes |

### MCP Servers Already Available

| MCP Server | Data Source | Notes |
|------------|------------|-------|
| `JamesANZ/prediction-market-mcp` | Polymarket + Kalshi + PredictIt unified | No API keys needed for reads |
| `@iqai/mcp-polymarket` | Polymarket (15 tools) | npm package, supports trading |
| `@iqai/mcp-kalshi` | Kalshi (15 tools) | npm package |
| GDELT Cloud MCP | GDELT events + GKG | 30 days, 15-min updates |
| Google Data Commons MCP | Public statistical data | Official Google release |

**What does NOT have MCP servers yet**: Flight tracking, ship tracking, earthquake/volcano/wildfire/storm data, satellite tracking, air quality. These physical-world data layers are Aster's current strength and a genuine gap in the MCP ecosystem.

---

## 6. The MCP Question: Does This Beat an AI with Tools?

This is the core strategic question. Here's the honest answer:

### What a Visual Globe Does That AI Chat Cannot

1. **Spatial pattern recognition**: Humans are extraordinarily good at seeing geographic patterns — clustering, voids, corridors, anomalies — when data is plotted on a map. Google Research confirms that even frontier multimodal models struggle with fine-grained spatial reasoning. An AI tells you "47 earthquakes in the Ring of Fire." A globe *shows* you the pattern forming.

2. **Ambient awareness**: A dashboard you glance at in 2 seconds gives situational awareness that takes 30 seconds of reading an AI response. For "is anything unusual happening right now," visual scanning beats conversational querying.

3. **Multi-dimensional overlay**: Seeing flights, ships, earthquakes, storms, and submarine cables *simultaneously on the same globe* creates emergent understanding. You notice a shipping lane passes through a seismic zone near undersea cables. That insight is accidental and visual — you'd never think to ask an AI that question.

4. **Shared context**: A dashboard on a wall or shared screen creates a common operating picture. Chat is inherently single-user.

### What AI + MCP Does That a Dashboard Cannot

1. **Ad-hoc analysis**: "What's the correlation between Polymarket Taiwan conflict odds and shipping traffic through the Taiwan Strait this month?" No dashboard will pre-build that query.

2. **Natural language interrogation**: "Show me all nuclear facilities within 100km of active conflict zones" beats filters and dropdowns.

3. **Cross-source synthesis**: An AI reads a news article, pulls the prediction market, checks financial exposure, gives an integrated briefing. A dashboard shows tiles — you do the synthesis.

4. **Zero build time for new questions**: Adding a data layer to Aster = frontend module + backend router + tests. Connecting an MCP = minutes.

### The Answer: Neither Alone Is Sufficient

The best architecture is **a globe you can talk to**. This is where the industry is converging:

- Google Finance integrated Kalshi + Polymarket data with Gemini AI generating probability analyses (Nov 2025)
- ThoughtSpot, Power BI + Copilot, and Tableau + Einstein all combine persistent dashboards with natural language query
- Dataminr's new Intel Agents combine persistent monitoring with agentic AI investigation

**A pure MCP approach fails** because:
- No persistent visual monitoring (you get answers, not a live display)
- No real-time streaming (MCP is request-response)
- Cost per query (every interaction burns tokens)
- Not "glanceable" — can't walk past a screen and see the state of the world
- The physical-world data layers (flights, ships, earthquakes) don't have MCP servers

**A pure dashboard approach fails** because:
- Static queries — can't ask ad-hoc questions
- Every new analysis requires engineering work
- No synthesis across data types
- Competes directly with World Monitor on a losing axis

**The hybrid is the product.**

---

## 7. What Actually Creates Value

### Who Would Actually Use This Daily?

Not "interested citizens" — they visit once, think "cool," and never come back. The actual daily users of geopolitical intelligence platforms are:

- **Corporate security teams** monitoring employee safety and facility risk
- **Supply chain risk managers** tracking disruptions
- **Commodity traders** correlating geopolitical events with market moves
- **Insurance/reinsurance analysts** assessing natural disaster exposure
- **Journalists and OSINT researchers**

These users pay $10K-$100K+/year at Stratfor, Recorded Future, and RANE because the tool is tied to a **recurring decision they must make**.

### The Daily-Use Test

A "Mission Control" becomes daily-use only when tied to a decision someone makes repeatedly:

- A supply chain manager checking: "Are any of my shipping routes disrupted?"
- A trader checking: "Have prediction market odds shifted enough to trigger a position?"
- A security analyst checking: "Are any of our 200 global offices near emerging incidents?"

**If the user has no recurring decision, the product is entertainment.** Entertainment products need massive scale to monetize. That's not where you want to be.

### What Palantir Figured Out

Palantir's $250B valuation comes from the **Ontology** — a semantic model mapping data objects to real-world counterparts that enables operational workflows. Their insight: the value isn't seeing data, it's the jump from "I see a problem" to "I'm taking action on this problem." OSS projects build observation tools. Palantir builds decision tools.

---

## 8. Three Strategic Paths

### Path A: The Intelligent Globe (Recommended)

**Concept**: Keep the globe as the persistent visual layer, but make AI the brain. The globe shows live data; an AI copilot synthesizes, predicts, and answers questions about what's on screen. Think "air traffic control meets ChatGPT."

**What this means technically**:
- Prediction market probabilities overlaid on the globe (geofenced to relevant regions)
- GDELT event density heatmaps showing where things are happening
- ACLED conflict markers with AI-generated context
- An AI sidebar/copilot that can answer "What's happening near the Suez Canal right now?" using all visible data layers + prediction markets + news
- Alerting when prediction market probabilities shift beyond thresholds
- Historical replay — "Show me how this region looked 7 days ago vs today"

**Why this wins**: Neither World Monitor nor any MCP-only approach does this. World Monitor has basic AI (threat classification) but no conversational interface. MCP-only has conversation but no persistent visual monitoring. This is the hybrid that neither camp has built.

**Moat**: The data pipeline (15+ real-time layers with proper caching, normalization, and spatial indexing) is genuinely hard to replicate and doesn't exist in the MCP ecosystem. The AI layer adds the "so what?" that turns observation into intelligence.

### Path B: Niche Vertical Tool

**Concept**: Pick ONE user persona (supply chain risk, commodity trading, OSINT analysis) and build Aster into a workflow tool for them. Custom watchlists, alerts, correlation analysis, prediction market integration specific to their domain.

**Pros**: Clear value prop, willingness to pay, retention from workflow integration.
**Cons**: Smaller market, requires deep domain expertise you may not have, loses the "Mission Control" vision.

### Path C: Keep Building the General Dashboard

**Concept**: Continue adding data layers, compete with World Monitor on features.

**Pros**: Fun to build, technically interesting, good portfolio project.
**Cons**: No moat, no clear user, no workflow. World Monitor has 18K stars and 80+ layers. An AI with 5 MCP servers can answer most questions this dashboard could. This path leads to a beautiful tech demo that nobody uses after the initial wow factor.

---

## 9. Recommended Path: The Intelligent Globe

### Core Thesis

**Aster should be the world's first open-source geospatial intelligence platform with an AI copilot.**

Not "another world monitor." Not "a dashboard." A **platform where live geospatial data, prediction markets, and AI converge to provide actionable intelligence.**

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   ASTER UI                          │
│  ┌──────────────────────┐  ┌─────────────────────┐  │
│  │    Interactive Globe  │  │    AI Copilot       │  │
│  │    (MapLibre+deck.gl) │  │    Sidebar/Panel    │  │
│  │                       │  │                     │  │
│  │  - Live data layers   │  │  - "What's          │  │
│  │  - Prediction overlays│  │    happening near    │  │
│  │  - Event markers      │  │    the Suez Canal?" │  │
│  │  - Heatmaps           │  │  - Alert summaries  │  │
│  │  - Historical replay  │  │  - Cross-source     │  │
│  │                       │  │    synthesis         │  │
│  └──────────────────────┘  └─────────────────────┘  │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────┐
│                 ASTER API                            │
│  ┌────────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │  Existing   │  │  New     │  │  AI/LLM         │  │
│  │  15 Layers  │  │  Intel   │  │  Service         │  │
│  │  (flights,  │  │  Layers  │  │                  │  │
│  │   ships,    │  │          │  │  - Query routing │  │
│  │   quakes..) │  │  - GDELT │  │  - Context       │  │
│  │             │  │  - ACLED │  │    assembly      │  │
│  │             │  │  - Pred  │  │  - Response      │  │
│  │             │  │    Mkts  │  │    generation    │  │
│  └────────────┘  └──────────┘  └─────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  PostgreSQL/TimescaleDB                        │  │
│  │  (historical data, trends, user watchlists)    │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### What Makes This Different From World Monitor

| Capability | World Monitor | Aster (Proposed) |
|------------|---------------|------------------|
| Live data layers | 80+ | 15+ (quality over quantity) |
| AI threat classification | Yes (basic) | Yes (advanced, with copilot) |
| Conversational AI interface | No | **Yes — the core differentiator** |
| Prediction market overlays | Basic Polymarket widget | **Deep integration — probabilities on the map, trend charts, threshold alerts** |
| Historical data/replay | No (ephemeral) | **Yes — TimescaleDB for time-series** |
| Cross-source synthesis | No (tiles side by side) | **Yes — AI connects dots across layers** |
| Alerting system | No | **Yes — probability shifts, event clustering** |
| MCP server | No | **Yes — Aster as an MCP server others can query** |

### The MCP Angle — Aster AS an MCP Server

This is the insight that ties everything together. Instead of asking "should we use MCPs instead of building a UI?" — **Aster should expose itself as an MCP server.**

This means:
- Any AI assistant (Claude, GPT, etc.) can query Aster's live data
- "What flights are currently over Ukraine?" gets answered from Aster's real-time pipeline
- "What's the earthquake activity near my supply chain routes?" hits Aster's spatial engine
- The globe UI is one interface; the MCP is another interface to the same intelligence

**No one has built this.** There are MCP servers for Polymarket and Kalshi. There are none for real-time flight tracking, ship tracking, earthquake monitoring, or any of the physical-world data layers Aster aggregates. Aster becomes the MCP server for the physical world.

---

## 10. What to Build Next

### Phase 1: Intelligence Layer (Weeks 1-4)

1. **Add prediction market data**
   - Polymarket WebSocket integration (real-time probability updates)
   - Kalshi REST integration (CFTC-regulated complement)
   - Map overlay: show probabilities geofenced to relevant regions
   - Probability trend charts in detail cards

2. **Add GDELT integration**
   - 15-minute event feed
   - Event density heatmap layer on the globe
   - News article cards linked to geographic locations

3. **Add ACLED conflict data**
   - Conflict event markers (battles, protests, violence against civilians)
   - Conflict intensity shading by region

4. **Add PostgreSQL/TimescaleDB**
   - Store historical snapshots of all data layers
   - Enable "show me 7 days ago" time-slider
   - Foundation for trend analysis

### Phase 2: AI Copilot (Weeks 5-8)

5. **AI service backend**
   - LLM integration (support Ollama local + cloud API fallback, similar to World Monitor's approach but deeper)
   - Context assembly: when user asks a question, gather relevant data from visible layers + prediction markets + GDELT
   - Streaming responses

6. **Copilot UI**
   - Sidebar panel with chat interface
   - Globe-aware context: "What's happening here?" uses current viewport
   - Click-to-ask: click any marker to get AI-synthesized context
   - Suggested questions based on current view

7. **Alerting system**
   - Threshold-based alerts (prediction market probability crosses X%)
   - Anomaly detection (unusual clustering of events)
   - Configurable per-user alert rules

### Phase 3: Platform (Weeks 9-12)

8. **Aster MCP Server**
   - Expose all data layers as MCP tools
   - Spatial queries: "events within X km of point Y"
   - Temporal queries: "activity in region Z over the last 7 days"
   - Cross-layer queries: "infrastructure near conflict zones"

9. **User features**
   - Watchlists (monitor specific regions or topics)
   - Saved views (custom layer configurations)
   - Shareable URLs with full state

10. **Intelligence reports**
    - AI-generated daily/weekly briefings
    - Region-specific intelligence summaries
    - Exportable reports (similar to GlobalThreatMap's dossiers but richer)

---

## 11. What to Avoid

### Do NOT Build

1. **More data layers for the sake of more layers.** World Monitor has 80+. Competing on layer count is a losing game. Each new layer should add intelligence, not just dots on a map.

2. **A general-purpose "world dashboard" with no specific user in mind.** This is the path to a beautiful tech demo nobody uses. Every feature should answer: "Who makes what decision with this?"

3. **Your own LLM or AI model.** Use existing models (Claude API, Ollama, Groq). The value is in the data pipeline and context assembly, not the model.

4. **Real-time Twitter/X integration at $5K/month.** GDELT already processes social signals. Use GDELT as a proxy unless you have a specific use case that demands raw tweets.

5. **A trading interface for prediction markets.** Let Polymarket and Kalshi handle trading. Aster should consume and display probabilities, not facilitate bets.

6. **Dark web monitoring.** This is Recorded Future's moat ($250K+/year customers). You can't compete here and it's not where the OSS opportunity is.

7. **Classified data integration.** Palantir's moat. Don't even think about it.

8. **Mobile-native app.** PWA with responsive design is sufficient. Don't split engineering focus.

### Do NOT Fall Into These Traps

1. **The "cool demo" trap**: Building features that impress on first visit but don't drive retention. Every feature must serve a recurring use case.

2. **The "data completeness" trap**: Trying to monitor everything. Better to deeply integrate 20 sources with AI synthesis than shallowly aggregate 100 sources.

3. **The "World Monitor clone" trap**: If a feature exists in World Monitor and doesn't advance the AI copilot thesis, skip it. Differentiate, don't duplicate.

4. **The "build it all yourself" trap**: Use existing MCP servers for prediction markets. Use GDELT's infrastructure. Use Ollama for local AI. Build only the unique value layer.

---

## 12. Sources

### Competitive Landscape
- [World Monitor (GitHub, 18.2k stars)](https://github.com/koala73/worldmonitor)
- [GlobalThreatMap (GitHub)](https://github.com/unicodeveloper/globalthreatmap)
- [NASA Open MCT (GitHub, 12.6k stars)](https://github.com/nasa/openmct)
- [CesiumJS (GitHub, 14.8k stars)](https://github.com/CesiumGS/cesium)
- [deck.gl (GitHub, 13k stars)](https://github.com/visgl/deck.gl)
- [kepler.gl (GitHub, 11k stars)](https://github.com/keplergl/kepler.gl)
- [TerriaJS (GitHub, 1.3k stars)](https://github.com/TerriaJS/terriajs)
- [SpiderFoot (GitHub, 16.7k stars)](https://github.com/smicallef/spiderfoot)

### Prediction Markets
- [Polymarket API Docs](https://docs.polymarket.com/)
- [Kalshi API Docs](https://docs.kalshi.com/)
- [Metaculus API](https://www.metaculus.com/api/)
- [Manifold Markets API](https://docs.manifold.markets/api)
- [Geopolitical Bets Surge on Polymarket (Rest of World)](https://restofworld.org/2026/polymarket-online-betting-politics-war-charts/)
- [The Rise of Geopolitical Prediction Markets (CFR)](https://www.cfr.org/articles/rise-geopolitical-prediction-markets)
- [Prediction Markets vs Traditional Forecasting (Army MIPB)](https://mipb.ikn.army.mil/issues/jul-dec-2025/the-market-knows-best/)

### Data Sources
- [GDELT Project](https://www.gdeltproject.org/)
- [ACLED (Armed Conflict Location & Event Data)](https://acleddata.com/)
- [OpenSky Network](https://opensky-network.org/)
- [AISStream (Ship Tracking)](https://aisstream.io/)
- [NASA FIRMS (Wildfires)](https://firms.modaps.eosdis.nasa.gov/)

### MCP Ecosystem
- [MCP Registry (8,600+ servers)](https://registry.modelcontextprotocol.io/)
- [PulseMCP Directory](https://www.pulsemcp.com/servers)
- [Prediction Market MCP (unified)](https://github.com/JamesANZ/prediction-market-mcp)
- [IQ AI MCP Servers](https://blog.iqai.com/iq-ai-open-sources-mcp-servers-for-polymarket-kalshi-and-opinion-trade/)
- [GDELT Cloud MCP](https://docs.gdeltcloud.com/)

### Strategic Analysis
- [Palantir Demystified: Features and OSS Alternatives](https://dashjoin.medium.com/demystifying-palantir-features-and-open-source-alternatives-ed3ed39432f9)
- [Dataminr Intel Agents](https://www.dataminr.com/)
- [Dashboards Are Obsolete (The New Stack)](https://thenewstack.io/why-your-dashboards-are-obsolete-in-the-age-of-ai/)
- [Will Agentic AI Disrupt SaaS? (Bain)](https://www.bain.com/insights/will-agentic-ai-disrupt-saas-technology-report-2025/)
- [Teaching AI to Read a Map (Google Research)](https://research.google/blog/teaching-ai-to-read-a-map/)
- [SuperMap GIS + AI Technological Moat](https://www.supermap.com/en-us/news/?82_4223)
