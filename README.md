# AquaWatch NG

Satellite-detected standing water → AI-predicted malaria risk → automated alerts to health workers, before an outbreak starts.

Built for the NIGCOMSAT Accelerator 3.0 hackathon (Track C: Public Health Intelligence).

## The idea

Standing water after flooding is where malaria-carrying mosquitoes breed. AquaWatch watches for that water using Sentinel-1 satellite imagery, combines it with rainfall and population data, and scores every ward in the system for outbreak risk. When a ward crosses a risk threshold, the health worker responsible for it is alerted automatically by SMS, WhatsApp, and email — before cases start showing up at the clinic.

## How it fits together

```
Sentinel-1 / CHIRPS / WorldPop  ->  ml/ (Python, offline pipeline)
                                       |
                                       v
                              Supabase (Postgres + PostGIS)
                                       |
                    +------------------+------------------+
                    v                                      v
          ml-service (FastAPI)                    backend (Express + TS)
          serves live risk predictions      <----  calls ml-service, owns
          from the trained XGBoost model             auth, alerts, cron
                                                              |
                                                              v
                                                   frontend (Next.js 16)
                                                   the dashboard everyone uses
```

Everything reads from and writes to one Supabase project. `ml/` is not a running service — it's a set of scripts you run periodically (or once) to keep the database fed with fresh satellite data, a trained model, and satellite images.

## Repository layout

```
database/migrations/     every schema change, in order, run once against Supabase
ml/                       Python - data ingestion, model training, satellite image generation
ml-service/               FastAPI - wraps the trained model, serves POST /predict
backend/                  Express + TypeScript - auth, wards, alerts, notifications, audit log
frontend/                 Next.js 16 - the dashboard
render.yaml               Render deployment blueprint for backend + ml-service
```

## What's actually built

- **Role-based access** — government (sees everything), LGA official, ward official (CHEW), each scoped to their own data
- **Live risk scoring**, cached per ward and refreshed on a schedule (or on demand) so the dashboard loads fast instead of recomputing 700+ predictions per page view
- **Three-channel alerts** — SMS and WhatsApp via Twilio, email via Resend, each worker's channels determined by what they gave at signup (phone number, WhatsApp capability, email)
- **Configurable alert sensitivity** — a system default, overridable per ward or per LGA
- **Scheduled automation** — a cron job that re-checks every ward and fires alerts without anyone clicking a button
- **Satellite imagery per ward** — real Sentinel-1 water-detection images, generated offline and served from Cloudflare R2
- **Notifications history** — every alert ever sent, filterable by channel/status/ward, paginated
- **Analytics** — risk distribution and 14-day alert volume/channel charts
- **Audit log** — every profile change, threshold change, and alert trigger, government-only
- **In-app user guide** — plain-language help written for health workers, not developers

## Local setup

You'll run five things: the database (already hosted on Supabase, just needs migrations), the `ml/` pipeline (one-off/periodic scripts), `ml-service`, `backend`, and `frontend`.

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

`npm test` runs the full suite (170 tests, no live network or database calls — everything's dependency-injected and faked).

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

**Backend + ml-service -> Render.** `render.yaml` at the repo root defines both as separate Render web services from this one monorepo — Render picks it up automatically as a Blueprint. Variables marked `sync: false` in that file (database URL, Supabase service key, Twilio/Termii/Resend credentials) need to be set manually in the Render dashboard; they're intentionally not committed to git.

**Database -> already hosted**, no deployment step — just make sure every migration has been run against your production Supabase project too, separately from whatever you used for local dev if they differ.

**`ml/` -> not deployed as a service.** It's a set of scripts you run when you need to: re-seed data, retrain the model, or regenerate satellite images. Run them locally, or from any machine that can reach your Supabase database.

### Free-tier caution

Render's free tier spins a service down after inactivity — which silently kills any in-process cron schedule (`CRON_ENABLED=true` in the backend) if nothing wakes it back up. If you're relying on scheduled alerts in production, either keep the service warm with an external uptime pinger hitting `/health` on an interval, or move the schedule to something that triggers the backend externally instead of relying on the process staying alive.

## Notification channels — current status

- **SMS** — via Twilio, using a regular phone number (long code), not a custom Sender ID. Nigeria requires CAC business registration for a branded alphanumeric Sender ID; this setup deliberately avoids that requirement for now. Termii integration exists in the codebase (`backend/src/notifications/termiiSmsProvider.ts`) and can be swapped back in once a registered Sender ID is available — it's a one-line change in `backend/src/server.ts`.
- **WhatsApp** — via Twilio's WhatsApp Sandbox. Recipients need to join the sandbox once (send the join code to the sandbox number) before they can receive messages.
- **Email** — via Resend.

## Known limitations

- Twilio trial accounts can only send to phone numbers verified in the Twilio console — fine for a demo, not for production without upgrading the account.
- Satellite image generation is a real API call per ward (a few seconds each); regenerating images for all wards takes real time even with parallel workers. It's a periodic batch job, not something computed on page load.
- `population_density` shows near-zero feature importance in the trained model — this is a genuine data limitation (state-level proxy labels saturate at that level of granularity), not a bug, and is worth being upfront about if asked.