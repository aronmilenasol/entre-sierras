# Entre Sierras

Explore localities across San Luis and Córdoba, Argentina. The React + Vite frontend and FastAPI backend live in this repository and run as separate processes during development.

### Requirements

- Python 3.10 or later
- Node.js and npm

### Development

From the repository root, run:

```sh
npm run dev
```

This command creates the root `.venv` and installs missing dependencies, then starts both applications. Vite runs at `http://localhost:5173`; FastAPI runs at `http://localhost:8001`. Vite proxies `/api` and `/data` requests to FastAPI.

To run either process separately, install its dependencies first:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm run install:frontend
```

Then start the frontend with `npm run dev:frontend` and the backend with `npm run dev:backend`.

### Production

Build the frontend bundle with `npm run build`. When `frontend/dist` exists, FastAPI serves it alongside the API and geographic data available under `/data`.

Refresh the checked-in locality catalog with `npm run data:update`. It combines Georef settlements with census localities, uses INDEC population totals at government-local level, and enriches coordinates with Open-Meteo elevation when available.

### Deploy to Vercel

The [pyproject.toml](pyproject.toml) configuration tells Vercel where to find the FastAPI application and builds `frontend/dist` before packaging. Vercel serves FastAPI-mounted static files through its CDN and runs the API as a Vercel Function.

1. Push the repository to GitHub and create a Vercel project by importing that repository.
2. Set **Root Directory** to the repository root and select the **FastAPI** framework preset. Leave the build and install commands automatic and the output directory unset; the build is configured in `pyproject.toml`.
3. Select Node.js 22.x in the project settings. Use Python 3.12, Vercel's default version and compatible with this project's minimum. Backend dependencies are read from `requirements.txt`; npm installs the frontend with `npm ci --prefix frontend`.
4. Start a deployment from **Deployments**. Pushes to the production branch create production deployments; other branches create preview deployments.

You can also deploy from a terminal with Vercel CLI (version 48.1.8 or later):

```sh
npx vercel login
npx vercel link
npx vercel dev
npx vercel
npx vercel --prod
```

Use `vercel dev` to test Vercel routing locally before deployment. Then verify `/`, `/data/localities.geojson`, `/api/locality-context?department_id=14007`, and `/api/nearby-services?lat=-32.1763512233751&lon=-64.4569384953227`.

**Operational limits:** Vercel runs FastAPI as a serverless function. The in-memory caches in `services.py` are ephemeral and are not shared across instances; do not treat them as persistent storage. Requests to Overpass and IGN WFS still depend on third-party availability, rate limits, and response times. Shared or durable caching requires an external service such as Redis/KV or a database. Also check your plan's current function-duration limits if external requests approach the allowed execution time.

### Project structure

- `src/entre_sierras/`: FastAPI application and geographic data
- `frontend/`: React, TypeScript, Vite, and Tailwind CSS application
- `scripts/`: development and data update utilities
