# AquaWatch NG

**Satellite-detected standing water -> AI-predicted malaria risk -> automated alerts to health workers, before an outbreak starts.**

Built for the NIGCOMSAT Accelerator 3.0 hackathon — Track C: Public Health Intelligence.

**Live demo:** `TODO — add your deployed frontend URL here`
**API docs (Swagger):** `TODO — add your deployed backend URL here` + `/api-docs`

---

## The problem

Nigeria carries the largest malaria burden of any country on Earth. According to the WHO's *World Malaria Report 2025* (2024 data):

- **24.3%** of all malaria cases worldwide occur in Nigeria — roughly **68.5 million cases** in 2024 alone
- **30.3%** of all malaria deaths worldwide occur in Nigeria — the highest mortality burden of any country, an estimated **~185,000–198,000 deaths** in 2024
- Children under five account for the majority of those deaths

Malaria is transmitted by *Anopheles* mosquitoes, which breed in standing water. After flooding, newly formed pools of stagnant water become breeding grounds — and outbreaks typically follow rainfall and flooding by **2–4 weeks**, the incubation window for mosquito populations to build up and transmission to spread. That lag is also the window of opportunity: if you know where the water is *before* the outbreak, health workers can act — distributing nets, applying larvicide, stocking treatment — before people start getting sick, not after.

The problem is nobody is systematically watching for that water at ward level, in near-real-time, and connecting it to the health workers who could act on it.

## The solution

AquaWatch closes that loop end-to-end:

1. **Watch** — Sentinel-1 radar satellite imagery detects standing water at ward level, regardless of cloud cover (radar sees through clouds, unlike optical satellites — critical during rainy season, when cloud cover is heaviest and optical imagery is least useful).
2. **Predict** — that water signal, combined with rainfall anomaly and population density, feeds a trained machine learning model that scores every ward's malaria outbreak risk.
3. **Alert** — when a ward's risk crosses a threshold, the health worker responsible for that ward is notified automatically, by SMS, WhatsApp, and email — not buried in a dashboard nobody checks.
4. **Manage** — government, LGA, and ward-level officials each get a scoped view of exactly the wards they're responsible for, with full alert history, analytics, and an audit trail of every action taken.

## Architecture

**Offline data pipeline** — runs periodically, not on every request:

```
+-------------------------------+
|      External data sources     |
|  Sentinel-1 (radar imagery)    |
|  CHIRPS (rainfall)             |
|  WorldPop (population)         |
+---------------+----------------+
                |
                v
+-------------------------------+
|   ml/  (Python pipeline)       |
|   ingest -> engineer features  |
|   -> train XGBoost model       |
|   -> generate satellite images |
+---------------+----------------+
                |  writes
                v
+-------------------------------+        +-----------------------+
|  Supabase (Postgres+PostGIS)   |<------>|  Cloudflare R2         |
|  wards, observations, labels   |        |  ward satellite images |
+-------------------------------+        +-----------------------+
```

**Live serving path** — what runs when someone opens the dashboard or an alert fires:

```
+------------------------+  reads   +--------------------------------+
|   ml-service (FastAPI)  |<-------->|   Supabase (Postgres+PostGIS)   |
|   trained XGBoost model |  /predict|                                  |
+-----------+-------------+          +----------------+-----------------+
            | calls                                    |
            v                                           | reads/writes
+---------------------------------------------------------------------+
|                    backend (Express + TypeScript)                     |
|   auth . role scoping . risk caching . alerts . cron . audit log      |
|   Swagger docs at /api-docs                                           |
+-----------+-------------------------+--------------------+------------+
            |                         |                    |
            v                         v                    v
+--------------------+   +--------------------+   +--------------------+
| frontend (Next.js)   |   | Twilio (SMS/WA)      |   |  Resend (Email)      |
| the dashboard          |   | alert delivery        |   |  alert delivery       |
+--------------------+   +--------------------+   +--------------------+
            |
            v
   Government / LGA / Ward officials
        and CHEWs, on the ground
```

## Data flow, step by step

1. `ml/` fetches Sentinel-1 imagery, CHIRPS rainfall, and WorldPop population data for every ward, and writes the processed values into `environmental_observations` in Supabase.
2. A trained XGBoost model (also produced by `ml/`) is loaded by `ml-service`, which exposes it as a `POST /predict` endpoint.
3. The `backend` calls `ml-service` to score a ward's risk, then **caches** that score on the `wards` table — a scheduled job (or a manual, batched, progress-visible trigger) keeps every ward's cached score fresh, so the dashboard never has to run live inference for hundreds of wards on every page load.
4. Whenever a ward's risk crosses a threshold (a system default, overridable per ward or LGA), the `backend` dispatches an alert to every health worker registered for that ward — by SMS and/or WhatsApp (Twilio) and email (Resend), depending on what that worker provided at signup.
5. The `frontend` reads all of this through the `backend`'s API, scoped to whatever the signed-in user is allowed to see: government sees every ward, an LGA official sees their LGA, a ward official (CHEW) sees only their own ward.
6. Every significant action — a profile change, a threshold change, a manual or scheduled alert trigger — is written to an `audit_logs` table, visible to government accounts.

## Tech stack

| Layer | Technology |
|---|---|
| Data ingestion & ML training | Python, XGBoost, `sentinelhub-py`, `geopandas`, `rasterio` |
| Model serving | FastAPI |
| Backend API | Express + TypeScript, `pg`, Zod, Vitest |
| Frontend | Next.js 16 (App Router), Tailwind v4, Supabase Auth |
| Database | Supabase (Postgres + PostGIS) |
| Object storage | Cloudflare R2 (satellite images) |
| SMS / WhatsApp | Twilio |
| Email | Resend |
| API documentation | OpenAPI 3.0 via Swagger UI |

## Repository layout

```
database/migrations/     every schema change, in order, run once against Supabase
ml/                       Python - data ingestion, model training, satellite image generation
ml-service/               FastAPI - wraps the trained model, serves POST /predict
backend/                  Express + TypeScript - auth, wards, alerts, notifications, audit log
frontend/                 Next.js 16 - the dashboard
render.yaml               Render deployment blueprint for backend + ml-service
```

## Features

- **Role-based access** — government (all wards), LGA official (their LGA), ward official/CHEW (their ward)
- **Cached, fast risk scoring** — refreshed on a schedule or via a batched, progress-visible manual trigger, instead of recomputing live on every page load
- **Three-channel alerts** — SMS and WhatsApp via Twilio, email via Resend, based on what each worker provided at signup (including whether their number is on WhatsApp at all)
- **Configurable alert sensitivity** — system default, overridable per ward or per LGA
- **Scheduled automation** — a cron job re-checks every ward and fires alerts without anyone clicking a button
- **Satellite imagery per ward** — real Sentinel-1 water-detection images, zoomable, with a legend, generated offline and served from Cloudflare R2
- **Notifications history** — every alert ever sent, filterable by channel/status/ward, paginated
- **Analytics** — risk distribution and 14-day alert volume/channel charts
- **Audit log** — every profile change, threshold change, and alert trigger, government-only
- **In-app user guide** — plain-language help written for health workers, not developers
- **Mobile-accessible dashboard** — full navigation on phones, not just desktop
- **Interactive API documentation** — every endpoint documented and testable via Swagger UI

## API documentation

The full API is documented with OpenAPI 3.0 and served live from the running backend:

- **Interactive docs (Swagger UI):** `<backend-url>/api-docs`
- **Raw spec (importable into Postman/Insomnia):** `<backend-url>/api-docs.json`

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Service health check |
| GET | `/public/wards` | List wards (unauthenticated — signup dropdowns) |
| POST | `/users/profile` | Create/update the caller's profile |
| GET | `/users/me` | Get the caller's own profile |
| PATCH | `/users/threshold` | Update the caller's personal alert threshold |
| GET | `/wards` | List wards in the caller's scope |
| POST | `/wards/risk/refresh-cache` | Refresh cached risk for every ward (government, long-running) |
| POST | `/wards/risk/refresh-batch` | Refresh cached risk for a small batch (government, UI-driven) |
| GET | `/wards/alerts/stats` | Aggregated sent/failed counts |
| GET | `/wards/alerts/analytics` | 14-day channel/volume analytics |
| GET | `/wards/alerts/recent` | 10 most recent alerts |
| GET | `/wards/alerts` | Paginated, filterable alert history |
| GET | `/wards/{wardId}` | Get a single ward |
| GET | `/wards/{wardId}/risk` | Live (uncached) risk assessment |
| POST | `/wards/{wardId}/alerts/trigger` | Evaluate and dispatch alerts for one ward |
| GET | `/wards/{wardId}/alerts` | Alert history for one ward |
| POST | `/health-workers` | Register a health worker as an alert recipient |
| GET | `/health-workers/ward/{wardId}` | List health workers for a ward |
| GET | `/audit-logs` | Paginated system activity log (government only) |

Every endpoint except `/health` and `/public/*` requires a Supabase bearer token in the `Authorization` header.

## Local setup

You'll run five things: the database (hosted on Supabase, just needs migrations), the `ml/` pipeline (one-off/periodic scripts), `ml-service`, `backend`, and `frontend`.

### 1. Database

Run every file in `database/migrations/` against your Supabase project, in numeric order — either via `ml/scripts/run_migrations.sh` or by pasting each into the Supabase SQL Editor.

### 2. ml/ — data pipeline

```bash
cd ml
cp .env.example .env   # fill in DATABASE_URL, Sentinel Hub credentials, R2 credentials
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python -m aquawatch.seed_wards
python -m aquawatch.seed_labels
python -m aquawatch.seed_environmental_data
python -m aquawatch.cli train
python -m aquawatch.seed_satellite_images   # optional, needs R2 credentials too
```

`python -m pytest -v` runs the full suite (35 tests, no live network calls).

### 3. ml-service

```bash
cp ml/data/models/malaria_risk_xgb.joblib ml-service/app/model/malaria_risk_xgb.joblib
cd ml-service
cp .env.example .env
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

`GET /health` should report `model_loaded: true`.

### 4. backend

```bash
cd backend
cp .env.example .env   # see the full variable list in that file
npm install
npm run dev
```

`npm test` runs the full suite (184 tests, no live network or database calls — everything's dependency-injected and faked). Visit `http://localhost:4000/api-docs` for interactive API docs.

### 5. frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Visit `http://localhost:3000`, sign up, and check the dashboard.

## Deployment

**Frontend -> Vercel.** Set the project root to `frontend/`. Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_BACKEND_URL` (your deployed backend's URL).

**Backend + ml-service -> Render.** `render.yaml` at the repo root defines both as separate Render web services from this one monorepo — Render picks it up automatically as a Blueprint. Variables marked `sync: false` in that file need to be set manually in the Render dashboard.

**Database -> already hosted**, no deployment step — just make sure every migration has been run against your production Supabase project too.

**`ml/` -> not deployed as a service.** It's a set of scripts you run when you need to: re-seed data, retrain the model, or regenerate satellite images.

### Free-tier caution

Render's free tier spins a service down after inactivity, which silently kills any in-process cron schedule. If relying on scheduled alerts in production, keep the service warm with an external uptime pinger hitting `/health` on an interval.

## Notification channels — current status

- **SMS** — via Twilio, using a regular phone number (long code), not a custom Sender ID. Nigeria requires CAC business registration for a branded alphanumeric Sender ID; this setup deliberately avoids that requirement. Termii integration exists in the codebase (`backend/src/notifications/termiiSmsProvider.ts`) and can be swapped back in once a registered Sender ID is available — a one-line change in `backend/src/server.ts`.
- **WhatsApp** — via Twilio's WhatsApp Sandbox. Recipients need to join the sandbox once before they can receive messages.
- **Email** — via Resend.

## Known limitations

- Twilio trial accounts can only send to phone numbers verified in the Twilio console — fine for a demo, not production without upgrading the account.
- Satellite images are 512x512px. They're rendered as a clean two-tone water/land map rather than raw radar backscatter, specifically for clarity — real SAR imagery is inherently speckled (a physical property of radar, not a resolution artifact), and a flat, high-contrast render is far easier for a non-technical viewer to interpret at a glance.
- `population_density` shows near-zero feature importance in the trained model — a genuine data limitation (state-level proxy labels saturate at that granularity), not a bug.

## Team / competition

Built for NIGCOMSAT Accelerator 3.0, Track C: Public Health Intelligence.