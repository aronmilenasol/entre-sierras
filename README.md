# Entre Sierras

Explore localities across San Luis and Córdoba, Argentina. The React + Vite frontend and FastAPI backend live in this repository and run as separate processes during development.

## Requirements

- Python 3.10 or later
- Node.js and npm

## Development

From the repository root, run:

```sh
npm run dev
```

This command creates the root `.venv` and installs Python or frontend dependencies when they are missing, then starts both applications. Vite runs at `http://localhost:5173`; FastAPI runs at `http://localhost:8001`. Vite proxies `/api` and `/data` requests to FastAPI.

To run either process separately, first install its dependencies:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm run install:frontend
```

Then start the frontend with `npm run dev:frontend` and the backend with `npm run dev:backend`.

## Production

Build the frontend bundle with `npm run build`. When `frontend/dist` exists, FastAPI serves it alongside the API and geographic data available under `/data`.

Refresh the checked-in locality catalog with `npm run data:update`. It combines Georef settlements with census localities, uses INDEC population totals at government-local level, and enriches coordinates with Open-Meteo elevation when available.

## Project structure

- `src/entre_sierras/`: FastAPI application and geographic data
- `frontend/`: React, TypeScript, Vite, and Tailwind CSS application
- `scripts/`: development and data update utilities
